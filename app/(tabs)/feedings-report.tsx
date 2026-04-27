import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { format, subDays, startOfDay, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { BabyFeeding } from '@/types/database';
import { GradientBackground } from '@/components/GradientBackground';
import { useUserContext } from '@/lib/user-context';
import { usePremium } from '@/lib/usePremium';
import { Ionicons } from '@expo/vector-icons';

type Breast = 'left' | 'right' | 'both';

const DAYS_PER_PAGE = 3;

interface DaySummary {
  day: string;
  feedings: BabyFeeding[];
  count: number;
  avgMinutes: number | null;
  totalMinutes: number | null;
  avgInterval: number | null;
  breastCounts: Record<Breast, number>;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getDayLabel(dateStr: string): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === today) return 'Hoje';
  if (dateStr === yesterday) return 'Ontem';
  return format(parseISO(dateStr), "d 'de' MMMM", { locale: ptBR });
}

function breastLabel(breast: Breast): string {
  return breast === 'left' ? 'Esquerdo' : breast === 'right' ? 'Direito' : 'Ambos';
}

function buildSummaries(feedings: BabyFeeding[]): DaySummary[] {
  const grouped: Record<string, BabyFeeding[]> = {};
  for (const f of feedings) {
    const day = format(new Date(f.started_at), 'yyyy-MM-dd');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(f);
  }

  return Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map(day => {
      const dayFeedings = grouped[day];
      const breastCounts: Record<Breast, number> = { left: 0, right: 0, both: 0 };
      for (const f of dayFeedings) breastCounts[f.breast]++;

      // Duração média: só para mamadas que têm ended_at
      const withEnd = dayFeedings.filter(f => f.ended_at !== null);
      const avgMinutes = withEnd.length > 0
        ? Math.round(
            withEnd.reduce((s, f) => s + Math.max(0, differenceInMinutes(new Date(f.ended_at!), new Date(f.started_at))), 0)
            / withEnd.length
          )
        : null;
      const totalMinutes = withEnd.length > 0
        ? withEnd.reduce((s, f) => s + Math.max(0, differenceInMinutes(new Date(f.ended_at!), new Date(f.started_at))), 0)
        : null;

      // Intervalo médio entre mamadas do dia (início → início)
      const sorted = [...dayFeedings].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
      const avgInterval = sorted.length > 1
        ? Math.round(
            sorted.slice(1).reduce((sum, f, i) =>
              sum + differenceInMinutes(new Date(f.started_at), new Date(sorted[i].started_at)), 0
            ) / (sorted.length - 1)
          )
        : null;

      return { day, feedings: dayFeedings, count: dayFeedings.length, avgMinutes, totalMinutes, avgInterval, breastCounts };
    });
}

export default function FeedingsReportScreen() {
  const { effectiveUserId } = useUserContext();
  const { isPremium, loading: premiumLoading } = usePremium();

  const [babyId, setBabyId] = useState<string | null>(null);
  const [feedings, setFeedings] = useState<BabyFeeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [oldestLoadedDate, setOldestLoadedDate] = useState<Date | null>(null);

  const checkHasMore = useCallback(async (id: string, beforeDate: Date) => {
    const { count } = await supabase
      .from('baby_feedings')
      .select('id', { count: 'exact', head: true })
      .eq('baby_id', id)
      .lt('started_at', beforeDate.toISOString());
    return (count || 0) > 0;
  }, []);

  const loadData = useCallback(async () => {
    if (!effectiveUserId) return;
    try {
      const { data: babyData } = await supabase
        .from('babies')
        .select('id')
        .eq('user_id', effectiveUserId)
        .single();

      if (!babyData) { setLoading(false); return; }
      setBabyId(babyData.id);

      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = startOfDay(subDays(new Date(), DAYS_PER_PAGE - 1));

      const { data } = await supabase
        .from('baby_feedings')
        .select('*')
        .eq('baby_id', babyData.id)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false });

      setFeedings(data || []);
      setOldestLoadedDate(startDate);
      setHasMore(await checkHasMore(babyData.id, startDate));
    } catch (e) {
      console.error('Erro ao carregar relatório:', e);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, checkHasMore]);

  const loadMore = useCallback(async () => {
    if (!babyId || !oldestLoadedDate || loadingMore) return;
    setLoadingMore(true);
    try {
      const endDate = oldestLoadedDate;
      const startDate = startOfDay(subDays(oldestLoadedDate, DAYS_PER_PAGE));

      const { data } = await supabase
        .from('baby_feedings')
        .select('*')
        .eq('baby_id', babyId)
        .gte('started_at', startDate.toISOString())
        .lt('started_at', endDate.toISOString())
        .order('started_at', { ascending: false });

      setFeedings(prev => [...prev, ...(data || [])]);
      setOldestLoadedDate(startDate);
      setHasMore(await checkHasMore(babyId, startDate));
    } catch (e) {
      console.error('Erro ao carregar mais dados de relatório:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [babyId, oldestLoadedDate, loadingMore, checkHasMore]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading || premiumLoading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  if (!isPremium) {
    return (
      <GradientBackground>
        <View style={styles.gateContainer}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.gateBack}
          >
            <Text style={styles.gateBackText}>←</Text>
          </TouchableOpacity>
          <View style={styles.gateContent}>
            <Ionicons name="lock-closed-outline" size={48} color={Colors.primary} />
            <Text style={styles.gateTitle}>Recurso Premium</Text>
            <Text style={styles.gateSubtitle}>
              Os relatórios de mamadas são exclusivos para assinantes Premium.
            </Text>
            <TouchableOpacity
              style={styles.gateButton}
              onPress={() => router.push('/(tabs)/paywall' as any)}
            >
              <Text style={styles.gateButtonText}>Conhecer planos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GradientBackground>
    );
  }

  const summaries = buildSummaries(feedings);

  // Estatísticas gerais (últimos 7 dias carregados)
  const last7Days = summaries.slice(0, 7);
  const totalLast7 = last7Days.reduce((s, d) => s + d.count, 0);
  const avgPerDay = last7Days.length > 0 ? (totalLast7 / last7Days.length).toFixed(1) : '–';

  const breastTotal: Record<Breast, number> = { left: 0, right: 0, both: 0 };
  for (const f of feedings) breastTotal[f.breast]++;
  const mostUsedBreast = feedings.length > 0
    ? (['left', 'right', 'both'] as Breast[]).reduce((a, b) => breastTotal[a] >= breastTotal[b] ? a : b)
    : null;

  // Intervalo médio global entre mamadas (dos dados carregados)
  const allSorted = [...feedings].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
  const globalIntervals = allSorted.slice(1).map((f, i) =>
    differenceInMinutes(new Date(f.started_at), new Date(allSorted[i].started_at))
  );
  const globalAvgInterval = globalIntervals.length > 0
    ? Math.round(globalIntervals.reduce((s, d) => s + d, 0) / globalIntervals.length)
    : 0;

  return (
    <GradientBackground>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/feedings')}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.eyebrow}>MAMADAS</Text>
            <Text style={styles.title}>Relatórios</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {feedings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Nenhuma mamada registrada ainda.</Text>
            </View>
          ) : (
            <>
              {/* Cards de resumo geral */}
              <Text style={styles.sectionLabel}>Visão geral</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{avgPerDay}</Text>
                  <Text style={styles.statLabel}>mamadas{'\n'}por dia{'\n'}(últ. 7 dias)</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{globalAvgInterval > 0 ? formatDuration(globalAvgInterval) : '–'}</Text>
                  <Text style={styles.statLabel}>intervalo{'\n'}médio entre{'\n'}mamadas</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{mostUsedBreast ? breastLabel(mostUsedBreast) : '–'}</Text>
                  <Text style={styles.statLabel}>seio mais{'\n'}frequente</Text>
                </View>
              </View>

              {/* Detalhes por dia */}
              <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Por dia</Text>
              {summaries.map(summary => (
                <View key={summary.day} style={styles.dayCard}>
                  {/* Cabeçalho do dia */}
                  <View style={styles.dayCardHeader}>
                    <Text style={styles.dayCardTitle}>{getDayLabel(summary.day)}</Text>
                    <Text style={styles.dayCardDate}>
                      {format(parseISO(summary.day), 'dd/MM/yyyy')}
                    </Text>
                  </View>

                  {/* Métricas do dia */}
                  <View style={styles.dayMetrics}>
                    <View style={styles.dayMetricItem}>
                      <Text style={styles.dayMetricValue}>{summary.count}</Text>
                      <Text style={styles.dayMetricLabel}>mamadas</Text>
                    </View>
                    {summary.avgInterval !== null && (
                      <>
                        <View style={styles.dayMetricDivider} />
                        <View style={styles.dayMetricItem}>
                          <Text style={styles.dayMetricValue}>{formatDuration(summary.avgInterval)}</Text>
                          <Text style={styles.dayMetricLabel}>intervalo</Text>
                        </View>
                      </>
                    )}
                    {summary.totalMinutes !== null && (
                      <>
                        <View style={styles.dayMetricDivider} />
                        <View style={styles.dayMetricItem}>
                          <Text style={styles.dayMetricValue}>{formatDuration(summary.totalMinutes)}</Text>
                          <Text style={styles.dayMetricLabel}>total</Text>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Distribuição de seios */}
                  <View style={styles.breastDistRow}>
                    {(['left', 'right', 'both'] as Breast[]).map(b => (
                      summary.breastCounts[b] > 0 && (
                        <View key={b} style={styles.breastDistItem}>
                          <View style={[styles.breastDot, b === 'both' && styles.breastDotBoth]} />
                          <Text style={styles.breastDistText}>
                            {breastLabel(b)}: <Text style={styles.breastDistCount}>{summary.breastCounts[b]}x</Text>
                          </Text>
                        </View>
                      )
                    ))}
                  </View>

                  {/* Lista de mamadas do dia */}
                  <View style={styles.feedingsList}>
                    {summary.feedings.map((f, i) => {
                      const hasDuration = f.ended_at !== null;
                      const dur = hasDuration
                        ? Math.max(0, differenceInMinutes(new Date(f.ended_at!), new Date(f.started_at)))
                        : null;
                      return (
                        <View key={f.id} style={[styles.feedingRow, i === 0 && styles.feedingRowFirst]}>
                          <Text style={styles.feedingRowTime}>
                            {format(new Date(f.started_at), 'HH:mm')}
                            {hasDuration ? ` → ${format(new Date(f.ended_at!), 'HH:mm')}` : ''}
                          </Text>
                          <Text style={styles.feedingRowDur}>{dur !== null ? formatDuration(dur) : '–'}</Text>
                          <Text style={styles.feedingRowBreast}>{breastLabel(f.breast)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}

              {/* Botão carregar mais */}
              {hasMore && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMore}
                  disabled={loadingMore}
                  activeOpacity={0.7}
                >
                  {loadingMore
                    ? <ActivityIndicator color={Colors.primary} size="small" />
                    : <Text style={styles.loadMoreText}>Carregar mais</Text>
                  }
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: { fontSize: 20, color: Colors.text, fontWeight: '600' },
  headerTitles: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },

  // Content
  content: { paddingHorizontal: 18, paddingBottom: 40 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 16, fontWeight: '500', color: Colors.textSecondary },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardWarm,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },

  // Day card
  dayCard: {
    backgroundColor: Colors.cardWarm,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dayCardTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  dayCardDate: { fontSize: 13, color: Colors.textTertiary, fontWeight: '500' },

  // Day metrics
  dayMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  dayMetricItem: { flex: 1, alignItems: 'center' },
  dayMetricValue: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 3 },
  dayMetricLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  dayMetricDivider: { width: 1, height: 32, backgroundColor: Colors.neutral },

  // Breast distribution
  breastDistRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  breastDistItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  breastDotBoth: { backgroundColor: Colors.secondary },
  breastDistText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  breastDistCount: { fontWeight: '700', color: Colors.text },

  // Feedings list
  feedingsList: { borderTopWidth: 1, borderTopColor: Colors.neutral },
  feedingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral,
  },
  feedingRowFirst: { borderTopWidth: 0 },
  feedingRowTime: { flex: 1.5, fontSize: 13, fontWeight: '600', color: Colors.text },
  feedingRowDur: { flex: 1, fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  feedingRowBreast: { flex: 1, fontSize: 13, fontWeight: '500', color: Colors.textSecondary, textAlign: 'right' },

  // Load more
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // Gate
  gateContainer: { flex: 1, paddingHorizontal: 20 },
  gateBack: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 60, marginBottom: 8,
  },
  gateBackText: { fontSize: 20, color: Colors.text, fontWeight: '600' },
  gateContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingBottom: 60 },
  gateTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  gateSubtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  gateButton: {
    backgroundColor: Colors.primary, borderRadius: 99,
    paddingVertical: 13, paddingHorizontal: 28,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    marginTop: 8,
  },
  gateButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
