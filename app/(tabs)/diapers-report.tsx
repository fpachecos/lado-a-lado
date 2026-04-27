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
import { format, subDays, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { BabyDiaper } from '@/types/database';
import { GradientBackground } from '@/components/GradientBackground';
import { useUserContext } from '@/lib/user-context';
import { PoopColorId, DiaperType, getPoopColor, isNormalPoop } from '@/lib/diaper-colors';
import { usePremium } from '@/lib/usePremium';
import { Ionicons } from '@expo/vector-icons';

const DAYS_PER_PAGE = 3;

const TYPE_LABELS: Record<DiaperType, string> = {
  pee: 'Xixi',
  poop: 'Cocô',
  both: 'Ambos',
};

interface DaySummary {
  day: string;
  diapers: BabyDiaper[];
  count: number;
  peeCnt: number;
  poopCnt: number;
  bothCnt: number;
  normalPoopCnt: number;
  abnormalPoopCnt: number;
}

function buildSummaries(diapers: BabyDiaper[]): DaySummary[] {
  const grouped: Record<string, BabyDiaper[]> = {};
  for (const d of diapers) {
    const day = format(new Date(d.recorded_at), 'yyyy-MM-dd');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(d);
  }

  return Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map(day => {
      const dayDiapers = grouped[day];
      const peeCnt = dayDiapers.filter(d => d.type === 'pee').length;
      const poopCnt = dayDiapers.filter(d => d.type === 'poop').length;
      const bothCnt = dayDiapers.filter(d => d.type === 'both').length;
      const poopDiapers = dayDiapers.filter(d => d.type === 'poop' || d.type === 'both');
      const normalPoopCnt = poopDiapers.filter(d => d.poop_color && isNormalPoop(d.poop_color as PoopColorId)).length;
      const abnormalPoopCnt = poopDiapers.filter(d => d.poop_color && !isNormalPoop(d.poop_color as PoopColorId)).length;
      return { day, diapers: dayDiapers, count: dayDiapers.length, peeCnt, poopCnt, bothCnt, normalPoopCnt, abnormalPoopCnt };
    });
}

function getDayLabel(dateStr: string): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === today) return 'Hoje';
  if (dateStr === yesterday) return 'Ontem';
  return format(parseISO(dateStr), "d 'de' MMMM", { locale: ptBR });
}

export default function DiapersReportScreen() {
  const { effectiveUserId } = useUserContext();
  const { isPremium, loading: premiumLoading } = usePremium();

  const [babyId, setBabyId] = useState<string | null>(null);
  const [diapers, setDiapers] = useState<BabyDiaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [oldestLoadedDate, setOldestLoadedDate] = useState<Date | null>(null);

  const checkHasMore = useCallback(async (id: string, beforeDate: Date) => {
    const { count } = await supabase
      .from('baby_diapers')
      .select('id', { count: 'exact', head: true })
      .eq('baby_id', id)
      .lt('recorded_at', beforeDate.toISOString());
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
        .from('baby_diapers')
        .select('*')
        .eq('baby_id', babyData.id)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: false });

      setDiapers(data || []);
      setOldestLoadedDate(startDate);
      setHasMore(await checkHasMore(babyData.id, startDate));
    } catch (e) {
      console.error('Erro ao carregar relatório de fraldas:', e);
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
        .from('baby_diapers')
        .select('*')
        .eq('baby_id', babyId)
        .gte('recorded_at', startDate.toISOString())
        .lt('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: false });

      setDiapers(prev => [...prev, ...(data || [])]);
      setOldestLoadedDate(startDate);
      setHasMore(await checkHasMore(babyId, startDate));
    } catch (e) {
      console.error('Erro ao carregar mais dados de fraldas:', e);
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
              Os relatórios de fraldas são exclusivos para assinantes Premium.
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

  const summaries = buildSummaries(diapers);

  // Visão geral
  const last7 = summaries.slice(0, 7);
  const totalLast7 = last7.reduce((s, d) => s + d.count, 0);
  const avgPerDay = last7.length > 0 ? (totalLast7 / last7.length).toFixed(1) : '–';

  const allPoops = diapers.filter(d => d.type === 'poop' || d.type === 'both');
  const normalCount = allPoops.filter(d => d.poop_color && isNormalPoop(d.poop_color as PoopColorId)).length;
  const normalPct = allPoops.length > 0 ? Math.round((normalCount / allPoops.length) * 100) : null;

  const typeCounts: Record<DiaperType, number> = { pee: 0, poop: 0, both: 0 };
  for (const d of diapers) typeCounts[d.type]++;
  const mostUsedType = diapers.length > 0
    ? (['pee', 'poop', 'both'] as DiaperType[]).reduce((a, b) => typeCounts[a] >= typeCounts[b] ? a : b)
    : null;

  return (
    <GradientBackground>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/diapers')}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.eyebrow}>FRALDAS</Text>
            <Text style={styles.title}>Relatórios</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {diapers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Nenhuma fralda registrada ainda.</Text>
            </View>
          ) : (
            <>
              {/* Visão geral */}
              <Text style={styles.sectionLabel}>Visão geral</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{avgPerDay}</Text>
                  <Text style={styles.statLabel}>fraldas{'\n'}por dia{'\n'}(últ. 7 dias)</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, normalPct !== null && {
                    color: normalPct >= 80 ? Colors.success : Colors.error,
                  }]}>
                    {normalPct !== null ? `${normalPct}%` : '–'}
                  </Text>
                  <Text style={styles.statLabel}>cocô{'\n'}normal</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{mostUsedType ? TYPE_LABELS[mostUsedType] : '–'}</Text>
                  <Text style={styles.statLabel}>tipo mais{'\n'}frequente</Text>
                </View>
              </View>

              {/* Por dia */}
              <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Por dia</Text>
              {summaries.map(summary => {
                const totalPoops = summary.normalPoopCnt + summary.abnormalPoopCnt;
                const dayNormalPct = totalPoops > 0
                  ? Math.round((summary.normalPoopCnt / totalPoops) * 100)
                  : null;

                return (
                  <View key={summary.day} style={styles.dayCard}>
                    <View style={styles.dayCardHeader}>
                      <Text style={styles.dayCardTitle}>{getDayLabel(summary.day)}</Text>
                      <Text style={styles.dayCardDate}>{format(parseISO(summary.day), 'dd/MM/yyyy')}</Text>
                    </View>

                    {/* Métricas */}
                    <View style={styles.dayMetrics}>
                      <View style={styles.dayMetricItem}>
                        <Text style={styles.dayMetricValue}>{summary.count}</Text>
                        <Text style={styles.dayMetricLabel}>fraldas</Text>
                      </View>
                      {summary.peeCnt > 0 && (
                        <>
                          <View style={styles.dayMetricDivider} />
                          <View style={styles.dayMetricItem}>
                            <Text style={styles.dayMetricValue}>{summary.peeCnt}</Text>
                            <Text style={styles.dayMetricLabel}>xixi</Text>
                          </View>
                        </>
                      )}
                      {(summary.poopCnt + summary.bothCnt) > 0 && (
                        <>
                          <View style={styles.dayMetricDivider} />
                          <View style={styles.dayMetricItem}>
                            <Text style={styles.dayMetricValue}>{summary.poopCnt + summary.bothCnt}</Text>
                            <Text style={styles.dayMetricLabel}>cocô</Text>
                          </View>
                        </>
                      )}
                      {dayNormalPct !== null && (
                        <>
                          <View style={styles.dayMetricDivider} />
                          <View style={styles.dayMetricItem}>
                            <Text style={[styles.dayMetricValue, {
                              color: dayNormalPct >= 80 ? Colors.success : Colors.error,
                            }]}>
                              {dayNormalPct}%
                            </Text>
                            <Text style={styles.dayMetricLabel}>normal</Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Alerta se cocô anormal */}
                    {summary.abnormalPoopCnt > 0 && (
                      <View style={styles.abnormalAlert}>
                        <Text style={styles.abnormalAlertText}>
                          {summary.abnormalPoopCnt} ocorrência{summary.abnormalPoopCnt > 1 ? 's' : ''} de cocô com cor atípica
                        </Text>
                      </View>
                    )}

                    {/* Lista */}
                    <View style={styles.diapersList}>
                      {summary.diapers.map((d, i) => {
                        const color = d.poop_color ? getPoopColor(d.poop_color as PoopColorId) : null;
                        return (
                          <View key={d.id} style={[styles.diaperRow, i === 0 && styles.diaperRowFirst]}>
                            <Text style={styles.diaperRowTime}>
                              {format(new Date(d.recorded_at), 'HH:mm')}
                            </Text>
                            <Text style={styles.diaperRowType}>{TYPE_LABELS[d.type]}</Text>
                            {color ? (
                              <View style={styles.diaperRowColorCell}>
                                <View style={[styles.diaperRowColorDot, { backgroundColor: color.hex }]} />
                                <Text style={[
                                  styles.diaperRowColorLabel,
                                  !color.normal && { color: Colors.error },
                                ]}>
                                  {color.label}
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.diaperRowNoColor}>–</Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

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

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 60, paddingBottom: 16,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  backButtonText: { fontSize: 20, color: Colors.text, fontWeight: '600' },
  headerTitles: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },

  content: { paddingHorizontal: 18, paddingBottom: 40 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 16, fontWeight: '500', color: Colors.textSecondary },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: Colors.cardWarm, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 3, alignItems: 'center',
  },
  statValue: {
    fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: 6, textAlign: 'center',
  },
  statLabel: {
    fontSize: 11, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500', lineHeight: 16,
  },

  dayCard: {
    backgroundColor: Colors.cardWarm, borderRadius: 20, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 3,
  },
  dayCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  dayCardTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  dayCardDate: { fontSize: 13, color: Colors.textTertiary, fontWeight: '500' },

  dayMetrics: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.glassBackground, borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  dayMetricItem: { flex: 1, alignItems: 'center' },
  dayMetricValue: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 3 },
  dayMetricLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  dayMetricDivider: { width: 1, height: 32, backgroundColor: Colors.neutral },

  abnormalAlert: {
    backgroundColor: 'rgba(224,52,40,0.08)',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(224,52,40,0.2)', marginBottom: 12,
  },
  abnormalAlertText: { fontSize: 12, fontWeight: '600', color: Colors.error },

  diapersList: { borderTopWidth: 1, borderTopColor: Colors.neutral },
  diaperRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.neutral,
  },
  diaperRowFirst: { borderTopWidth: 0 },
  diaperRowTime: { width: 46, fontSize: 13, fontWeight: '600', color: Colors.text },
  diaperRowType: { width: 48, fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  diaperRowColorCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  diaperRowColorDot: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  diaperRowColorLabel: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  diaperRowNoColor: { flex: 1, fontSize: 13, color: Colors.textTertiary },

  loadMoreButton: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, marginTop: 4, marginBottom: 8,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.glassBorder,
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
