import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { router } from 'expo-router';
import { format, subDays, startOfDay, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { BabyNap } from '@/types/database';
import { GradientBackground } from '@/components/GradientBackground';
import { useUserContext } from '@/lib/user-context';
import { usePremium } from '@/lib/usePremium';
import { Ionicons } from '@expo/vector-icons';

const REPORT_DAYS = 14;

interface DaySummary {
  day: string;
  naps: BabyNap[];
  napCount: number;
  totalSleepMin: number;
  avgNapMin: number | null;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getDayLabel(dateStr: string, short = false): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === today) return short ? 'Hoje' : 'Hoje';
  if (dateStr === yesterday) return short ? 'Ont.' : 'Ontem';
  return format(parseISO(dateStr), short ? 'dd/MM' : "d 'de' MMMM", { locale: ptBR });
}

function buildSummaries(naps: BabyNap[]): DaySummary[] {
  const grouped: Record<string, BabyNap[]> = {};
  for (const n of naps) {
    const day = format(new Date(n.started_at), 'yyyy-MM-dd');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(n);
  }
  return Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, dayNaps]) => {
      const withDuration = dayNaps.filter(n => n.ended_at !== null);
      const totalSleepMin = withDuration.reduce(
        (sum, n) => sum + differenceInMinutes(new Date(n.ended_at!), new Date(n.started_at)), 0
      );
      const avgNapMin = withDuration.length > 0
        ? Math.round(totalSleepMin / withDuration.length)
        : null;
      return { day, naps: dayNaps, napCount: dayNaps.length, totalSleepMin, avgNapMin };
    });
}

// Gráfico de barras simples SVG (horas de sono por dia)
function SleepBarChart({ summaries }: { summaries: DaySummary[] }) {
  const W = 320;
  const H = 140;
  const paddingLeft = 40;
  const paddingBottom = 28;
  const paddingTop = 12;
  const chartW = W - paddingLeft - 8;
  const chartH = H - paddingBottom - paddingTop;

  const maxH = Math.max(...summaries.map(s => s.totalSleepMin), 60);
  const barWidth = Math.min(28, chartW / summaries.length - 4);

  const reversed = [...summaries].reverse();

  return (
    <Svg width={W} height={H}>
      {/* Linhas guia horizontais */}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const y = paddingTop + chartH * (1 - frac);
        const label = Math.round((maxH * frac) / 60);
        return (
          <React.Fragment key={frac}>
            <Line x1={paddingLeft} y1={y} x2={W - 8} y2={y} stroke="rgba(160,144,128,0.15)" strokeWidth={1} />
            {frac > 0 && (
              <SvgText x={paddingLeft - 4} y={y + 4} fontSize={9} fill={Colors.textTertiary} textAnchor="end">
                {label}h
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
      {/* Barras */}
      {reversed.map((s, i) => {
        const x = paddingLeft + (chartW / reversed.length) * i + (chartW / reversed.length - barWidth) / 2;
        const barH = (s.totalSleepMin / maxH) * chartH;
        const y = paddingTop + chartH - barH;
        return (
          <React.Fragment key={s.day}>
            <Rect
              x={x} y={barH > 0 ? y : paddingTop + chartH - 2}
              width={barWidth} height={Math.max(2, barH)}
              rx={4} fill={Colors.primary} opacity={0.8}
            />
            <SvgText
              x={x + barWidth / 2} y={H - 8}
              fontSize={8} fill={Colors.textTertiary} textAnchor="middle"
            >
              {getDayLabel(s.day, true)}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// Gráfico de barras para quantidade de sonecas por dia
function NapCountChart({ summaries }: { summaries: DaySummary[] }) {
  const W = 320;
  const H = 120;
  const paddingLeft = 28;
  const paddingBottom = 28;
  const paddingTop = 8;
  const chartW = W - paddingLeft - 8;
  const chartH = H - paddingBottom - paddingTop;

  const maxC = Math.max(...summaries.map(s => s.napCount), 1);
  const barWidth = Math.min(28, chartW / summaries.length - 4);
  const reversed = [...summaries].reverse();

  return (
    <Svg width={W} height={H}>
      {[0, 0.5, 1].map(frac => {
        const y = paddingTop + chartH * (1 - frac);
        const label = Math.round(maxC * frac);
        return (
          <React.Fragment key={frac}>
            <Line x1={paddingLeft} y1={y} x2={W - 8} y2={y} stroke="rgba(160,144,128,0.15)" strokeWidth={1} />
            {frac > 0 && (
              <SvgText x={paddingLeft - 4} y={y + 4} fontSize={9} fill={Colors.textTertiary} textAnchor="end">
                {label}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
      {reversed.map((s, i) => {
        const x = paddingLeft + (chartW / reversed.length) * i + (chartW / reversed.length - barWidth) / 2;
        const barH = (s.napCount / maxC) * chartH;
        const y = paddingTop + chartH - barH;
        return (
          <React.Fragment key={s.day}>
            <Rect
              x={x} y={barH > 0 ? y : paddingTop + chartH - 2}
              width={barWidth} height={Math.max(2, barH)}
              rx={4} fill={Colors.secondary} opacity={0.9}
            />
            <SvgText
              x={x + barWidth / 2} y={H - 8}
              fontSize={8} fill={Colors.textTertiary} textAnchor="middle"
            >
              {getDayLabel(s.day, true)}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export default function NapsReportScreen() {
  const { effectiveUserId } = useUserContext();
  const { isPremium } = usePremium();
  const [naps, setNaps] = useState<BabyNap[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!effectiveUserId) return;
    try {
      const { data: babyData } = await supabase
        .from('babies').select('id').eq('user_id', effectiveUserId).single();
      if (!babyData) { setLoading(false); return; }

      const startDate = startOfDay(subDays(new Date(), REPORT_DAYS - 1));
      const { data } = await supabase
        .from('baby_naps')
        .select('*')
        .eq('baby_id', babyData.id)
        .gte('started_at', startDate.toISOString())
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false });

      setNaps(data || []);
    } catch (e) {
      console.error('Erro ao carregar relatório de sonecas:', e);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!isPremium) {
    return (
      <GradientBackground>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/naps')}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerTitles}>
              <Text style={styles.eyebrow}>BEBÊ</Text>
              <Text style={styles.title}>Relatórios de Sono</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.gateContainer}>
            <View style={styles.gateLockBadge}>
              <Ionicons name="lock-closed" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.gateTitle}>Recurso Premium</Text>
            <Text style={styles.gateSubtitle}>
              Acesse relatórios históricos de sono, gráficos de tendência e análises detalhadas das sonecas do seu bebê.
            </Text>
            <TouchableOpacity
              style={styles.gateButton}
              onPress={() => router.push('/(tabs)/paywall')}
              activeOpacity={0.8}
            >
              <Text style={styles.gateButtonText}>Ver planos →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GradientBackground>
    );
  }

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  const summaries = buildSummaries(naps);

  // Médias gerais (últimos 7 dias com dados)
  const last7 = summaries.slice(0, 7);
  const avgSleepMin = last7.length > 0
    ? Math.round(last7.reduce((s, d) => s + d.totalSleepMin, 0) / last7.length)
    : 0;
  const avgNapCount = last7.length > 0
    ? Math.round(last7.reduce((s, d) => s + d.napCount, 0) / last7.length)
    : 0;
  const avgNapDurMin = (() => {
    const withData = last7.filter(d => d.avgNapMin !== null);
    if (withData.length === 0) return null;
    return Math.round(withData.reduce((s, d) => s + d.avgNapMin!, 0) / withData.length);
  })();

  return (
    <GradientBackground>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/naps')}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.eyebrow}>BEBÊ</Text>
            <Text style={styles.title}>Relatórios de Sono</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {/* Cards de média geral */}
          <Text style={styles.sectionLabel}>Média últimos 7 dias</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatDuration(avgSleepMin)}</Text>
              <Text style={styles.statLabel}>sono/dia</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{avgNapCount}</Text>
              <Text style={styles.statLabel}>sonecas/dia</Text>
            </View>
            {avgNapDurMin !== null && (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatDuration(avgNapDurMin)}</Text>
                <Text style={styles.statLabel}>dur. média</Text>
              </View>
            )}
          </View>

          {/* Gráfico sono */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Horas de Sono por Dia</Text>
            <Text style={styles.chartSubtitle}>últimos {REPORT_DAYS} dias</Text>
            {summaries.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <SleepBarChart summaries={summaries} />
              </ScrollView>
            ) : (
              <Text style={styles.noDataText}>Sem dados suficientes.</Text>
            )}
          </View>

          {/* Gráfico qtd sonecas */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Quantidade de Sonecas por Dia</Text>
            <Text style={styles.chartSubtitle}>últimos {REPORT_DAYS} dias</Text>
            {summaries.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <NapCountChart summaries={summaries} />
              </ScrollView>
            ) : (
              <Text style={styles.noDataText}>Sem dados suficientes.</Text>
            )}
          </View>

          {/* Lista por dia */}
          <Text style={styles.sectionLabel}>Detalhamento por dia</Text>
          {summaries.map(s => (
            <View key={s.day} style={styles.dayCard}>
              <View style={styles.dayCardHeader}>
                <Text style={styles.dayCardTitle}>{getDayLabel(s.day)}</Text>
                <Text style={styles.dayCardDate}>{format(parseISO(s.day), 'dd/MM')}</Text>
              </View>
              <View style={styles.dayStatsRow}>
                <View style={styles.dayStatItem}>
                  <Text style={styles.dayStatValue}>{formatDuration(s.totalSleepMin)}</Text>
                  <Text style={styles.dayStatLabel}>dormindo</Text>
                </View>
                <View style={styles.dayStatItem}>
                  <Text style={styles.dayStatValue}>{s.napCount}</Text>
                  <Text style={styles.dayStatLabel}>{s.napCount === 1 ? 'soneca' : 'sonecas'}</Text>
                </View>
                {s.avgNapMin !== null && (
                  <View style={styles.dayStatItem}>
                    <Text style={styles.dayStatValue}>{formatDuration(s.avgNapMin)}</Text>
                    <Text style={styles.dayStatLabel}>dur. média</Text>
                  </View>
                )}
              </View>
              {s.naps.map(n => (
                <View key={n.id} style={styles.napRow}>
                  <Text style={styles.napRowTime}>
                    {format(new Date(n.started_at), 'HH:mm')}
                    {n.ended_at ? ` → ${format(new Date(n.ended_at), 'HH:mm')}` : ''}
                  </Text>
                  {n.ended_at && (
                    <Text style={styles.napRowDur}>
                      {formatDuration(differenceInMinutes(new Date(n.ended_at), new Date(n.started_at)))}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ))}

          {summaries.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Nenhuma soneca registrada nos últimos {REPORT_DAYS} dias.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },

  header: {
    flexDirection: 'row', alignItems: 'center',
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
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  headerSpacer: { width: 40 },

  content: { paddingHorizontal: 18, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 4,
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: Colors.cardWarm, borderRadius: 20, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.primary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500', marginTop: 3, textAlign: 'center' },

  chartCard: {
    backgroundColor: Colors.cardWarm, borderRadius: 24, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 16, elevation: 3,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  chartSubtitle: { fontSize: 12, color: Colors.textTertiary, fontWeight: '500', marginBottom: 12 },
  noDataText: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', paddingVertical: 16 },

  dayCard: {
    backgroundColor: Colors.cardWarm, borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarmLight, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  dayCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayCardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  dayCardDate: { fontSize: 12, color: Colors.textTertiary, fontWeight: '500' },
  dayStatsRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  dayStatItem: {},
  dayStatValue: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  dayStatLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  napRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1, borderTopColor: Colors.neutral },
  napRowTime: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  napRowDur: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },

  // Gate premium
  gateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  gateLockBadge: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.cardPrimary, borderWidth: 1, borderColor: Colors.borderPrimary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  gateTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  gateSubtitle: {
    fontSize: 15, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: 28,
  },
  gateButton: {
    backgroundColor: Colors.primary, borderRadius: 99,
    paddingVertical: 14, paddingHorizontal: 32,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30, shadowRadius: 10, elevation: 4,
  },
  gateButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
