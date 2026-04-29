import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { GradientBackground } from '@/components/GradientBackground';
import { useUserContext } from '@/lib/user-context';
import type {
  Baby,
  BabyFeeding,
  BabyDiaper,
  BabyNap,
  BabyWeight,
  BabyHeight,
} from '@/types/database';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS_PER_PAGE = 3;

type EventType = 'feeding' | 'diaper' | 'nap' | 'weight' | 'height';

interface TimelineEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  raw: BabyFeeding | BabyDiaper | BabyNap | BabyWeight | BabyHeight;
}

const EVENT_CONFIG: Record<
  EventType,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
    iconSet: 'ion' | 'mci';
    icon: string;
  }
> = {
  feeding: {
    color: '#FF6F61',
    bgColor: 'rgba(255, 111, 97, 0.10)',
    borderColor: 'rgba(255, 111, 97, 0.30)',
    label: 'Mamada',
    iconSet: 'mci',
    icon: 'baby-bottle-outline',
  },
  diaper: {
    color: '#5B9BD5',
    bgColor: 'rgba(91, 155, 213, 0.10)',
    borderColor: 'rgba(91, 155, 213, 0.30)',
    label: 'Fralda',
    iconSet: 'mci',
    icon: 'diaper-outline',
  },
  nap: {
    color: '#9B7FC9',
    bgColor: 'rgba(155, 127, 201, 0.10)',
    borderColor: 'rgba(155, 127, 201, 0.30)',
    label: 'Soneca',
    iconSet: 'ion',
    icon: 'moon-outline',
  },
  weight: {
    color: '#4BAE8A',
    bgColor: 'rgba(75, 174, 138, 0.10)',
    borderColor: 'rgba(75, 174, 138, 0.35)',
    label: 'Peso',
    iconSet: 'ion',
    icon: 'trending-up-outline',
  },
  height: {
    color: '#4BAE8A',
    bgColor: 'rgba(75, 174, 138, 0.10)',
    borderColor: 'rgba(75, 174, 138, 0.35)',
    label: 'Altura',
    iconSet: 'ion',
    icon: 'resize-outline',
  },
};

const BREAST_LABEL: Record<string, string> = {
  left: 'Seio esquerdo',
  right: 'Seio direito',
  both: 'Ambos os seios',
};

const DIAPER_TYPE_LABEL: Record<string, string> = {
  pee: 'Xixi',
  poop: 'Cocô',
  both: 'Xixi e Cocô',
};

const POOP_COLOR_LABEL: Record<string, string> = {
  c1: 'Preto pegajoso',
  c2: 'Marrom escuro',
  c3: 'Marrom',
  blood: 'Com sangue',
  black: 'Preto',
  c4: 'Marrom claro',
  c5: 'Amarelo',
  c6: 'Amarelo brilhante',
  c7: 'Diareia',
};

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(startStr: string, endStr: string | null | undefined): string {
  if (!endStr) return 'Em andamento';
  const minutes = Math.floor(
    (new Date(endStr).getTime() - new Date(startStr).getTime()) / 60000,
  );
  if (minutes < 1) return 'Menos de 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatDayLabel(dateStr: string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dateStr === toDateStr(today)) return 'Hoje';
  if (dateStr === toDateStr(yesterday)) return 'Ontem';
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} de ${MONTHS[m - 1]}`;
}

// ── EventIcon ─────────────────────────────────────────────────────────────────

function EventIcon({ type, color, size = 20 }: { type: EventType; color: string; size?: number }) {
  const cfg = EVENT_CONFIG[type];
  if (cfg.iconSet === 'mci') {
    return <MaterialCommunityIcons name={cfg.icon as any} size={size} color={color} />;
  }
  return <Ionicons name={cfg.icon as any} size={size} color={color} />;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function TimelineScreen() {
  const { effectiveUserId, isPremium } = useUserContext();

  const [baby, setBaby] = useState<Baby | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Start of the oldest window already loaded
  const oldestDateRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!isPremium) {
      setLoading(false);
      return;
    }
    if (effectiveUserId) loadBaby();
  }, [effectiveUserId, isPremium]);

  const loadBaby = async () => {
    const { data } = await supabase
      .from('babies')
      .select('*')
      .eq('user_id', effectiveUserId!)
      .single();
    setBaby(data ?? null);
    if (data) {
      const today = new Date();
      const windowEnd = new Date(today);
      windowEnd.setHours(23, 59, 59, 999);
      const windowStart = new Date(today);
      windowStart.setDate(today.getDate() - (DAYS_PER_PAGE - 1));
      windowStart.setHours(0, 0, 0, 0);

      oldestDateRef.current = windowStart;
      const batch = await fetchWindow(data.id, windowStart, windowEnd);
      setEvents(batch);
      updateHasMore(windowStart, data.birth_date);
    }
    setLoading(false);
  };

  const fetchWindow = async (babyId: string, windowStart: Date, windowEnd: Date): Promise<TimelineEvent[]> => {
    const si = windowStart.toISOString();
    const ei = windowEnd.toISOString();
    const sd = toDateStr(windowStart);
    const ed = toDateStr(windowEnd);

    const [f, d, n, w, h] = await Promise.all([
      supabase.from('baby_feedings').select('*').eq('baby_id', babyId).gte('started_at', si).lte('started_at', ei),
      supabase.from('baby_diapers').select('*').eq('baby_id', babyId).gte('recorded_at', si).lte('recorded_at', ei),
      supabase.from('baby_naps').select('*').eq('baby_id', babyId).gte('started_at', si).lte('started_at', ei),
      supabase.from('baby_weights').select('*').eq('baby_id', babyId).gte('measured_at', sd).lte('measured_at', ed),
      supabase.from('baby_heights').select('*').eq('baby_id', babyId).gte('measured_at', sd).lte('measured_at', ed),
    ]);

    return [
      ...(f.data ?? []).map(x => ({ id: x.id, type: 'feeding' as const, timestamp: new Date(x.started_at), raw: x })),
      ...(d.data ?? []).map(x => ({ id: x.id, type: 'diaper' as const, timestamp: new Date(x.recorded_at), raw: x })),
      ...(n.data ?? []).map(x => ({ id: x.id, type: 'nap' as const, timestamp: new Date(x.started_at), raw: x })),
      ...(w.data ?? []).map(x => ({ id: x.id, type: 'weight' as const, timestamp: new Date(x.measured_at + 'T12:00:00'), raw: x })),
      ...(h.data ?? []).map(x => ({ id: x.id, type: 'height' as const, timestamp: new Date(x.measured_at + 'T12:00:00'), raw: x })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const updateHasMore = (windowStart: Date, birthDate: string | null) => {
    if (birthDate) {
      const birth = new Date(birthDate);
      birth.setHours(0, 0, 0, 0);
      if (windowStart <= birth) { setHasMore(false); return; }
    }
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - 1);
    if (windowStart <= limit) { setHasMore(false); return; }
    setHasMore(true);
  };

  const handleLoadMore = async () => {
    if (!baby || loadingMore || !hasMore || !oldestDateRef.current) return;
    setLoadingMore(true);

    const windowEnd = new Date(oldestDateRef.current);
    windowEnd.setDate(windowEnd.getDate() - 1);
    windowEnd.setHours(23, 59, 59, 999);

    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowEnd.getDate() - (DAYS_PER_PAGE - 1));
    windowStart.setHours(0, 0, 0, 0);

    oldestDateRef.current = windowStart;
    const batch = await fetchWindow(baby.id, windowStart, windowEnd);
    setEvents(prev => [...prev, ...batch]);
    updateHasMore(windowStart, baby.birth_date);
    setLoadingMore(false);
  };

  const grouped = events.reduce<Record<string, TimelineEvent[]>>((acc, ev) => {
    const k = toDateStr(ev.timestamp);
    (acc[k] ??= []).push(ev);
    return acc;
  }, {});
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // ── Event details ──────────────────────────────────────────────────────────

  function renderDetails(event: TimelineEvent) {
    switch (event.type) {
      case 'feeding': {
        const x = event.raw as BabyFeeding;
        return (
          <>
            <Text style={styles.detail}>{BREAST_LABEL[x.breast] ?? x.breast}</Text>
            {x.ended_at && (
              <Text style={styles.detail}>Duração: {formatDuration(x.started_at, x.ended_at)}</Text>
            )}
          </>
        );
      }
      case 'diaper': {
        const x = event.raw as BabyDiaper;
        return (
          <>
            <Text style={styles.detail}>{DIAPER_TYPE_LABEL[x.type] ?? x.type}</Text>
            {x.poop_color && (
              <Text style={styles.detail}>Cor: {POOP_COLOR_LABEL[x.poop_color] ?? x.poop_color}</Text>
            )}
          </>
        );
      }
      case 'nap': {
        const x = event.raw as BabyNap;
        const range = x.ended_at
          ? `${formatTime(new Date(x.started_at))} → ${formatTime(new Date(x.ended_at))}`
          : `Início: ${formatTime(new Date(x.started_at))}`;
        return (
          <>
            <Text style={styles.detail}>{formatDuration(x.started_at, x.ended_at)}</Text>
            <Text style={styles.detail}>{range}</Text>
          </>
        );
      }
      case 'weight': {
        const x = event.raw as BabyWeight;
        const kg = (x.weight_grams / 1000).toFixed(3).replace(/\.?0+$/, '').replace('.', ',');
        return <Text style={styles.detail}>{kg} kg</Text>;
      }
      case 'height': {
        const x = event.raw as BabyHeight;
        const cm = (x.height_mm / 10).toFixed(1).replace('.', ',');
        return <Text style={styles.detail}>{cm} cm</Text>;
      }
    }
  }

  // ── Shared header ──────────────────────────────────────────────────────────

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={styles.headerTitles}>
        <Text style={styles.eyebrow}>BEBÊ</Text>
        <Text style={styles.title}>Linha do Tempo</Text>
      </View>
    </View>
  );

  // ── Premium gate ───────────────────────────────────────────────────────────

  if (!isPremium) {
    return (
      <GradientBackground>
        {header}
        <View style={styles.gateArea}>
          <View pointerEvents="none" style={styles.fakePreview}>
            {(['feeding', 'diaper', 'nap', 'weight'] as EventType[]).map((type, i) => {
              const cfg = EVENT_CONFIG[type];
              return (
                <View
                  key={type}
                  style={[styles.fakeCard, { backgroundColor: cfg.bgColor, borderColor: cfg.borderColor }]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: cfg.bgColor, borderColor: cfg.borderColor }]}>
                    <EventIcon type={type} color={cfg.color} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardLabel, { color: cfg.color }]}>{cfg.label}</Text>
                    <Text style={styles.cardTime}>{['14:30', '13:45', '11:00', '08:00'][i]}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <BlurView intensity={55} tint="light" style={styles.blurFill}>
            <View style={styles.premiumCenter}>
              <View style={styles.premiumBox}>
                <View style={styles.premiumIconWrap}>
                  <Ionicons name="time-outline" size={36} color={Colors.primary} />
                </View>
                <Text style={styles.premiumBoxTitle}>Linha do Tempo</Text>
                <Text style={styles.premiumBoxDesc}>
                  Todos os eventos do bebê em ordem cronológica — mamadas, fraldas, sonecas e medidas num único lugar.
                </Text>
                <TouchableOpacity
                  style={styles.premiumCta}
                  onPress={() => router.push('/(tabs)/paywall' as any)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="lock-closed" size={14} color="#fff" />
                  <Text style={styles.premiumCtaText}>Desbloquear Premium</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </GradientBackground>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <GradientBackground>
        {header}
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  // ── Main timeline ──────────────────────────────────────────────────────────

  return (
    <GradientBackground>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {header}
        <View style={styles.content}>
          {sortedDays.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="time-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Nenhum evento</Text>
              <Text style={styles.emptyText}>
                Registre mamadas, fraldas, sonecas ou medidas para ver a linha do tempo.
              </Text>
            </View>
          ) : (
            sortedDays.map(dayKey => (
              <View key={dayKey} style={styles.dayGroup}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{formatDayLabel(dayKey)}</Text>
                  <View style={styles.dayRule} />
                </View>

                {/* Timeline rail with events */}
                <View style={styles.rail}>
                  {grouped[dayKey].map((ev, i) => {
                    const cfg = EVENT_CONFIG[ev.type];
                    const isLast = i === grouped[dayKey].length - 1;
                    return (
                      <View key={ev.id} style={styles.railRow}>
                        {/* Dot + connector track */}
                        <View style={styles.track}>
                          <View style={[styles.dot, { backgroundColor: cfg.color }]} />
                          {!isLast && <View style={styles.connector} />}
                        </View>
                        {/* Event card */}
                        <View
                          style={[
                            styles.card,
                            { backgroundColor: cfg.bgColor, borderColor: cfg.borderColor },
                          ]}
                        >
                          <View style={styles.cardTop}>
                            <View
                              style={[
                                styles.iconWrap,
                                { backgroundColor: cfg.bgColor, borderColor: cfg.borderColor },
                              ]}
                            >
                              <EventIcon type={ev.type} color={cfg.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.cardLabel, { color: cfg.color }]}>{cfg.label}</Text>
                              <Text style={styles.cardTime}>{formatTime(ev.timestamp)}</Text>
                            </View>
                          </View>
                          <View style={styles.cardDetails}>{renderDetails(ev)}</View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          {sortedDays.length > 0 && (
            <TouchableOpacity
              style={[styles.loadMoreBtn, (!hasMore || loadingMore) && styles.loadMoreBtnOff]}
              onPress={handleLoadMore}
              disabled={!hasMore || loadingMore}
              activeOpacity={0.8}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : hasMore ? (
                <Text style={styles.loadMoreText}>Carregar mais dias</Text>
              ) : (
                <Text style={styles.loadMoreTextOff}>Sem mais registros</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },

  // Layout
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Day group
  dayGroup: { marginBottom: 20 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dayRule: { flex: 1, height: 1, backgroundColor: Colors.neutral },

  // Timeline rail
  rail: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.neutral,
    marginLeft: 11, // aligns with dot center (dot is 12px wide, margin = 11 centers at x=12)
    paddingLeft: 0,
  },

  railRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  track: {
    width: 24,
    alignItems: 'center',
    paddingTop: 10,
    marginLeft: -13, // pulls dot to overlap the rail line: -(dot_width/2 + rail_border_width/2) = -(6+1) ≈ -7; extra -6 for visual centering
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.cardWarm,
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.neutral,
    marginTop: 3,
    marginBottom: -10,
  },

  // Event card
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginLeft: 12,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: { fontSize: 13, fontWeight: '700', letterSpacing: -0.1 },
  cardTime: { fontSize: 11, fontWeight: '500', color: Colors.textSecondary, marginTop: 1 },
  cardDetails: { gap: 2 },
  detail: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  // Load more
  loadMoreBtn: {
    marginTop: 4,
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    backgroundColor: Colors.cardPrimary,
    alignItems: 'center',
  },
  loadMoreBtnOff: {
    borderColor: Colors.neutral,
    backgroundColor: Colors.glassBackground,
  },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  loadMoreTextOff: { fontSize: 14, fontWeight: '600', color: Colors.textTertiary },

  // Premium gate
  blurFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gateArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  fakePreview: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 10,
  },
  fakeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    height: 68,
  },
  premiumCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  premiumBox: {
    backgroundColor: Colors.cardWarm,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
    maxWidth: 320,
    width: '100%',
  },
  premiumIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.cardPrimary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumBoxTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: 'center',
  },
  premiumBoxDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  premiumCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 99,
    paddingVertical: 13,
    paddingHorizontal: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  premiumCtaText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
