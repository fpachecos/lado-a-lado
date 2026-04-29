import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle, Path, Line, Text as SvgText } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { format, subDays, startOfDay, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Baby, BabyNap } from '@/types/database';
import { GradientBackground } from '@/components/GradientBackground';
import DatePicker from '@/components/DatePicker';
import TimePicker from '@/components/TimePicker';
import { useUserContext } from '@/lib/user-context';
import { usePremium } from '@/lib/usePremium';
import { PremiumGateBanner } from '@/components/PremiumGateBanner';

const DAYS_PER_PAGE = 3;
const FREE_HISTORY_DAYS = 3;

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

// Relógio 24h SVG com arcos de sono/acordado
function SleepClock({ naps, activeNap, now }: { naps: BabyNap[]; activeNap: BabyNap | null; now: Date }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;
  const strokeWidth = 14;

  // Mapeia minutos do dia (0–1440) para ângulo (topo = meia-noite)
  const minToAngle = (min: number) => (min / 1440) * 360 - 90;

  const polarToXY = (angleDeg: number, radius: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const describeArc = (startMin: number, endMin: number) => {
    const startAngle = minToAngle(startMin);
    const endAngle = minToAngle(endMin);
    const start = polarToXY(startAngle, r);
    const end = polarToXY(endAngle, r);
    const span = endMin - startMin;
    const largeArc = span > 720 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const todayStart = startOfDay(now).getTime();
  const dayMinutes = (ts: number) => (ts - todayStart) / 60000;

  // Períodos de sono de hoje (incluindo soneca ativa)
  const allNaps = activeNap
    ? [...naps, activeNap]
    : naps;

  const sleepArcs = allNaps.map(nap => {
    const start = Math.max(0, dayMinutes(new Date(nap.started_at).getTime()));
    const end = nap.ended_at
      ? Math.min(1440, dayMinutes(new Date(nap.ended_at).getTime()))
      : Math.min(1440, dayMinutes(now.getTime()));
    return { start, end };
  }).filter(a => a.end > a.start);

  // Marcadores de hora (0h, 6h, 12h, 18h)
  const hourMarks = [0, 6, 12, 18];

  // Posição do ponteiro de "agora"
  const nowMin = dayMinutes(now.getTime());
  const nowAngle = minToAngle(Math.min(1440, nowMin));
  const nowInner = polarToXY(nowAngle, r - strokeWidth / 2 - 4);
  const nowOuter = polarToXY(nowAngle, r + strokeWidth / 2 + 4);

  return (
    <Svg width={size} height={size}>
      {/* Trilha cinza (24h) */}
      <Circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(160,144,128,0.18)"
        strokeWidth={strokeWidth}
      />
      {/* Arcos de sono */}
      {sleepArcs.map((arc, i) => (
        <Path
          key={i}
          d={describeArc(arc.start, arc.end)}
          fill="none"
          stroke={Colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ))}
      {/* Marcadores de hora */}
      {hourMarks.map(h => {
        const angle = minToAngle(h * 60);
        const inner = polarToXY(angle, r - strokeWidth / 2 - 2);
        const outer = polarToXY(angle, r + strokeWidth / 2 + 2);
        return (
          <Line
            key={h}
            x1={inner.x} y1={inner.y}
            x2={outer.x} y2={outer.y}
            stroke="rgba(120,90,60,0.30)"
            strokeWidth={1.5}
          />
        );
      })}
      {/* Labels 0h, 6h, 12h, 18h */}
      {hourMarks.map(h => {
        const angle = minToAngle(h * 60);
        const pos = polarToXY(angle, r + strokeWidth / 2 + 14);
        return (
          <SvgText
            key={`label-${h}`}
            x={pos.x} y={pos.y + 4}
            fontSize={9}
            fontWeight="700"
            fill={Colors.textTertiary}
            textAnchor="middle"
          >
            {h === 0 ? '0h' : `${h}h`}
          </SvgText>
        );
      })}
      {/* Ponteiro de agora */}
      {nowMin <= 1440 && (
        <Line
          x1={nowInner.x} y1={nowInner.y}
          x2={nowOuter.x} y2={nowOuter.y}
          stroke={Colors.text}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      )}
      {/* Texto central */}
      <SvgText x={cx} y={cy - 6} fontSize={11} fontWeight="800" fill={Colors.textTertiary} textAnchor="middle">
        SONO
      </SvgText>
      <SvgText x={cx} y={cy + 10} fontSize={11} fontWeight="800" fill={Colors.textTertiary} textAnchor="middle">
        HOJE
      </SvgText>
    </Svg>
  );
}

export default function NapsScreen() {
  const { effectiveUserId } = useUserContext();
  const { isPremium } = usePremium();

  const [baby, setBaby] = useState<Baby | null>(null);
  const [babyId, setBabyId] = useState<string | null>(null);
  const [naps, setNaps] = useState<BabyNap[]>([]);
  const [activeNap, setActiveNap] = useState<BabyNap | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [oldestLoadedDate, setOldestLoadedDate] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'start' | 'end' | 'edit'>('start');
  const [editingNap, setEditingNap] = useState<BabyNap | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedNap, setSelectedNap] = useState<BabyNap | null>(null);
  const [saving, setSaving] = useState(false);

  const [startDateTime, setStartDateTime] = useState<Date>(new Date());
  const [endDateTime, setEndDateTime] = useState<Date>(new Date());

  // Ticker real-time
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(new Date()), 10000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  const checkHasMore = useCallback(async (id: string, beforeDate: Date) => {
    const { count } = await supabase
      .from('baby_naps')
      .select('id', { count: 'exact', head: true })
      .eq('baby_id', id)
      .lt('started_at', beforeDate.toISOString())
      .not('ended_at', 'is', null);
    return (count || 0) > 0;
  }, []);

  const loadData = useCallback(async () => {
    if (!effectiveUserId) return;
    try {
      const { data: babyData } = await supabase
        .from('babies').select('*').eq('user_id', effectiveUserId).single();
      if (!babyData) { setLoading(false); return; }
      setBaby(babyData);
      setBabyId(babyData.id);

      // Soneca ativa (sem ended_at)
      const { data: active } = await supabase
        .from('baby_naps')
        .select('*')
        .eq('baby_id', babyData.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveNap(active || null);

      // Últimos DAYS_PER_PAGE dias concluídos
      const endDate = new Date(); endDate.setHours(23, 59, 59, 999);
      const startDate = startOfDay(subDays(new Date(), DAYS_PER_PAGE - 1));

      const { data: napsData } = await supabase
        .from('baby_naps')
        .select('*')
        .eq('baby_id', babyData.id)
        .gte('started_at', startDate.toISOString())
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false });

      setNaps(napsData || []);
      setOldestLoadedDate(startDate);
      setHasMore(await checkHasMore(babyData.id, startDate));
    } catch (e) {
      console.error('Erro ao carregar sonecas:', e);
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
        .from('baby_naps')
        .select('*')
        .eq('baby_id', babyId)
        .gte('started_at', startDate.toISOString())
        .lt('started_at', endDate.toISOString())
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false });
      setNaps(prev => [...prev, ...(data || [])]);
      setOldestLoadedDate(startDate);
      setHasMore(await checkHasMore(babyId, startDate));
    } catch (e) {
      console.error('Erro ao carregar mais sonecas:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [babyId, oldestLoadedDate, loadingMore, checkHasMore]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Botão principal ────────────────────────────────────────────────────────
  const handleMainButton = () => {
    if (activeNap) {
      // Finalizar soneca
      setEndDateTime(new Date());
      setModalMode('end');
    } else {
      // Iniciar soneca
      setStartDateTime(new Date());
      setModalMode('start');
    }
    setEditingNap(null);
    setShowModal(true);
  };

  const openEditModal = (nap: BabyNap) => {
    setEditingNap(nap);
    setStartDateTime(new Date(nap.started_at));
    setEndDateTime(nap.ended_at ? new Date(nap.ended_at) : new Date());
    setModalMode('edit');
    setShowModal(true);
  };

  // ─── Salvar ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!baby) return;
    setSaving(true);
    try {
      if (modalMode === 'start') {
        // Nova soneca
        const { error } = await supabase.from('baby_naps').insert({
          baby_id: baby.id,
          started_at: startDateTime.toISOString(),
          ended_at: null,
        });
        if (error) throw error;
      } else if (modalMode === 'end' && activeNap) {
        if (endDateTime <= new Date(activeNap.started_at)) {
          showAlert('Horário inválido', 'O fim deve ser após o início.');
          setSaving(false);
          return;
        }
        const { error } = await supabase.from('baby_naps')
          .update({ ended_at: endDateTime.toISOString() })
          .eq('id', activeNap.id);
        if (error) throw error;
      } else if (modalMode === 'edit' && editingNap) {
        if (endDateTime <= startDateTime) {
          showAlert('Horário inválido', 'O fim deve ser após o início.');
          setSaving(false);
          return;
        }
        const { error } = await supabase.from('baby_naps')
          .update({ started_at: startDateTime.toISOString(), ended_at: endDateTime.toISOString() })
          .eq('id', editingNap.id);
        if (error) throw error;
      }
      setShowModal(false);
      await loadData();
    } catch (e: any) {
      showAlert('Erro', 'Não foi possível salvar a soneca.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (nap: BabyNap) => {
    const doDelete = async () => {
      const { error } = await supabase.from('baby_naps').delete().eq('id', nap.id);
      if (!error) {
        setNaps(prev => prev.filter(n => n.id !== nap.id));
        if (activeNap?.id === nap.id) setActiveNap(null);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Deseja excluir esta soneca?')) doDelete();
    } else {
      Alert.alert('Excluir soneca', 'Deseja excluir esta soneca?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  function showAlert(title: string, msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert(title, msg);
  }

  // ─── Cálculos de hoje ────────────────────────────────────────────────────────
  const todayKey = format(now, 'yyyy-MM-dd');

  const todayNaps = naps.filter(n => format(new Date(n.started_at), 'yyyy-MM-dd') === todayKey);
  const todayActiveContrib = activeNap
    ? Math.max(0, differenceInMinutes(now, new Date(activeNap.started_at)))
    : 0;
  const todaySleepMin = todayNaps.reduce((sum, n) => {
    if (!n.ended_at) return sum;
    return sum + differenceInMinutes(new Date(n.ended_at), new Date(n.started_at));
  }, 0) + todayActiveContrib;

  // Horas acordado = desde meia-noite até agora menos o sono
  const midnightToNow = differenceInMinutes(now, startOfDay(now));
  const awakeMin = Math.max(0, midnightToNow - todaySleepMin);

  const napCountToday = todayNaps.length + (activeNap ? 1 : 0);

  // Elapsed da soneca ativa
  const activeElapsedMin = activeNap
    ? Math.max(0, differenceInMinutes(now, new Date(activeNap.started_at)))
    : 0;

  // ─── Agrupamento por dia ─────────────────────────────────────────────────────
  const grouped: Record<string, BabyNap[]> = {};
  for (const n of naps) {
    const day = format(new Date(n.started_at), 'yyyy-MM-dd');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(n);
  }
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const FREE_HISTORY_LIMIT = startOfDay(subDays(new Date(), FREE_HISTORY_DAYS));

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.eyebrow}>BEBÊ</Text>
            <Text style={styles.title}>Sonecas</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/naps-report')}
            style={styles.reportButton}
          >
            <Text style={styles.reportButtonText}>Relatórios</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Card resumo hoje + relógio */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryLabel}>Hoje</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{formatDuration(todaySleepMin)}</Text>
                  <Text style={styles.summaryItemLabel}>dormindo</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{napCountToday}</Text>
                  <Text style={styles.summaryItemLabel}>{napCountToday === 1 ? 'soneca' : 'sonecas'}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{formatDuration(awakeMin)}</Text>
                  <Text style={styles.summaryItemLabel}>acordado</Text>
                </View>
              </View>
            </View>
            <SleepClock naps={todayNaps} activeNap={activeNap} now={now} />
          </View>

          {/* Botão principal redondo */}
          <View style={styles.mainButtonWrapper}>
            {activeNap && (
              <Text style={styles.activeElapsedText}>{formatDuration(activeElapsedMin)} dormindo</Text>
            )}
            <TouchableOpacity
              style={[styles.mainButton, activeNap ? styles.mainButtonActive : styles.mainButtonIdle]}
              onPress={handleMainButton}
              activeOpacity={0.8}
            >
              <Text style={styles.mainButtonEmoji}>{activeNap ? '☀️' : '🌙'}</Text>
              <Text style={styles.mainButtonLabel}>{activeNap ? 'Acordar' : 'Soneca'}</Text>
            </TouchableOpacity>
          </View>

          {/* Lista por dia */}
          {sortedDays.map(day => (
            <View key={day}>
              <Text style={styles.dayHeader}>{getDayLabel(day)}</Text>
              {grouped[day].map(nap => {
                const dur = nap.ended_at
                  ? differenceInMinutes(new Date(nap.ended_at), new Date(nap.started_at))
                  : null;
                return (
                  <TouchableOpacity
                    key={nap.id}
                    style={styles.napItem}
                    onPress={() => { setSelectedNap(nap); setShowActionMenu(true); }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.napTimeBlock}>
                      <Text style={styles.napTime}>{format(new Date(nap.started_at), 'HH:mm')}</Text>
                      <Text style={styles.napTimeSep}>→</Text>
                      <Text style={styles.napTime}>
                        {nap.ended_at ? format(new Date(nap.ended_at), 'HH:mm') : '...'}
                      </Text>
                    </View>
                    {dur !== null && (
                      <View style={styles.napDurationBadge}>
                        <Text style={styles.napDurationText}>{formatDuration(dur)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {naps.length === 0 && !activeNap && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Nenhuma soneca registrada ainda.</Text>
              <Text style={styles.emptyStateSubtext}>Toque em "Soneca" para começar a registrar.</Text>
            </View>
          )}

          {/* Carregar mais */}
          {hasMore && (
            !isPremium && oldestLoadedDate !== null && oldestLoadedDate < FREE_HISTORY_LIMIT ? (
              <PremiumGateBanner message="Veja o histórico completo de sonecas" />
            ) : (
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
            )
          )}

          <Text style={styles.deleteHint}>Toque em um registro para editar ou excluir</Text>
        </View>
      </ScrollView>

      {/* Modal início / fim / edição */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <BlurView intensity={80} tint="light" style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {modalMode === 'start' ? 'Início da Soneca' : modalMode === 'end' ? 'Acordar' : 'Editar Soneca'}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {(modalMode === 'start' || modalMode === 'edit') && (
                  <>
                    <Text style={styles.modalSectionLabel}>Início</Text>
                    <View style={styles.dateTimeRow}>
                      <View style={styles.datePickerWrapper}>
                        <DatePicker value={startDateTime} onChange={d => {
                          const u = new Date(d);
                          u.setHours(startDateTime.getHours(), startDateTime.getMinutes(), 0);
                          setStartDateTime(u);
                        }} maximumDate={new Date()} />
                      </View>
                      <View style={styles.timePickerWrapper}>
                        <TimePicker value={startDateTime} onChange={d => {
                          const u = new Date(startDateTime);
                          u.setHours(d.getHours(), d.getMinutes(), 0);
                          setStartDateTime(u);
                        }} />
                      </View>
                      <TouchableOpacity style={styles.nowButton} onPress={() => setStartDateTime(new Date())}>
                        <Text style={styles.nowButtonText}>Agora</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                {(modalMode === 'end' || modalMode === 'edit') && (
                  <>
                    <Text style={styles.modalSectionLabel}>Fim</Text>
                    <View style={styles.dateTimeRow}>
                      <View style={styles.datePickerWrapper}>
                        <DatePicker value={endDateTime} onChange={d => {
                          const u = new Date(d);
                          u.setHours(endDateTime.getHours(), endDateTime.getMinutes(), 0);
                          setEndDateTime(u);
                        }} maximumDate={new Date()} />
                      </View>
                      <View style={styles.timePickerWrapper}>
                        <TimePicker value={endDateTime} onChange={d => {
                          const u = new Date(endDateTime);
                          u.setHours(d.getHours(), d.getMinutes(), 0);
                          setEndDateTime(u);
                        }} />
                      </View>
                      <TouchableOpacity style={styles.nowButton} onPress={() => setEndDateTime(new Date())}>
                        <Text style={styles.nowButtonText}>Agora</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                <View style={{ height: 20 }} />
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)} disabled={saving}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveButtonText}>Salvar</Text>
                  }
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Menu de ações do item */}
      <Modal visible={showActionMenu} transparent animationType="fade" onRequestClose={() => setShowActionMenu(false)}>
        <TouchableOpacity style={styles.actionMenuOverlay} activeOpacity={1} onPress={() => setShowActionMenu(false)}>
          <BlurView intensity={80} tint="light" style={styles.actionMenuContent}>
            <View style={styles.modalHandle} />
            {selectedNap && (
              <Text style={styles.actionMenuSubtitle}>
                {format(new Date(selectedNap.started_at), 'HH:mm')}
                {selectedNap.ended_at ? ` → ${format(new Date(selectedNap.ended_at), 'HH:mm')}` : ''}
              </Text>
            )}
            <TouchableOpacity style={styles.actionMenuItem} onPress={() => {
              setShowActionMenu(false);
              if (selectedNap) openEditModal(selectedNap);
            }}>
              <Text style={styles.actionMenuItemText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionMenuItem, styles.actionMenuItemDanger]} onPress={() => {
              setShowActionMenu(false);
              if (selectedNap) handleDelete(selectedNap);
            }}>
              <Text style={styles.actionMenuItemDangerText}>Excluir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionMenuItem, styles.actionMenuItemCancel]} onPress={() => setShowActionMenu(false)}>
              <Text style={styles.actionMenuItemCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </BlurView>
        </TouchableOpacity>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
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
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  reportButton: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  reportButtonText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  content: { paddingHorizontal: 18, paddingBottom: 40 },

  // Summary card com relógio
  summaryCard: {
    backgroundColor: Colors.cardWarm, borderRadius: 24,
    paddingVertical: 16, paddingHorizontal: 20,
    marginBottom: 20, borderWidth: 1, borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 16, elevation: 3,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  summaryLeft: { flex: 1, paddingRight: 8 },
  summaryLabel: {
    fontSize: 11, fontWeight: '800', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14,
  },
  summaryRow: { gap: 12 },
  summaryItem: {},
  summaryValue: { fontSize: 18, fontWeight: '700', color: Colors.primary, letterSpacing: -0.5 },
  summaryItemLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500', marginTop: 1 },

  // Botão principal redondo
  mainButtonWrapper: { alignItems: 'center', marginBottom: 28 },
  activeElapsedText: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    marginBottom: 12, letterSpacing: 0.2,
  },
  mainButton: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  mainButtonIdle: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
  },
  mainButtonActive: {
    backgroundColor: Colors.secondary,
    shadowColor: Colors.secondary,
  },
  mainButtonEmoji: { fontSize: 32, marginBottom: 4 },
  mainButtonLabel: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  // Day header
  dayHeader: {
    fontSize: 11, fontWeight: '800', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4,
  },

  // Nap item
  napItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cardWarm, borderRadius: 16,
    paddingVertical: 13, paddingHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarmLight, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  napTimeBlock: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  napTime: { fontSize: 15, fontWeight: '600', color: Colors.text },
  napTimeSep: { fontSize: 13, color: Colors.textTertiary },
  napDurationBadge: {
    backgroundColor: Colors.cardPrimary, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.borderPrimary,
  },
  napDurationText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  emptyStateSubtext: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center' },

  loadMoreButton: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, marginTop: 4, marginBottom: 8,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glass,
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  deleteHint: { textAlign: 'center', fontSize: 12, color: Colors.textTertiary, marginTop: 8, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalContent: {
    backgroundColor: Colors.glassDark, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 20, maxHeight: '85%', borderWidth: 1, borderColor: Colors.glassBorder, overflow: 'hidden',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.neutral,
    alignSelf: 'center', marginBottom: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 16, letterSpacing: -0.3 },
  modalSectionLabel: {
    fontSize: 11, fontWeight: '800', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 16,
  },
  dateTimeRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  datePickerWrapper: { flex: 1.4 },
  timePickerWrapper: { flex: 1 },
  nowButton: {
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.cardPrimary, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderPrimary, paddingHorizontal: 10, minWidth: 52,
  },
  nowButtonText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelButton: {
    flex: 1, paddingVertical: 15, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glass, alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  saveButton: {
    flex: 1, paddingVertical: 15, borderRadius: 16,
    backgroundColor: Colors.primary, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Action menu
  actionMenuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center',
  },
  actionMenuContent: {
    backgroundColor: Colors.glassDark, borderRadius: 28,
    padding: 8, minWidth: 290, maxWidth: '88%',
    borderWidth: 1, borderColor: Colors.glassBorder, overflow: 'hidden',
  },
  actionMenuSubtitle: {
    fontSize: 13, color: Colors.textSecondary, fontWeight: '500',
    textAlign: 'center', paddingBottom: 8, paddingHorizontal: 20,
  },
  actionMenuItem: {
    paddingVertical: 15, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral,
  },
  actionMenuItemDanger: { borderBottomWidth: 1, borderBottomColor: Colors.neutral },
  actionMenuItemCancel: { borderBottomWidth: 0, marginTop: 4, marginBottom: 4 },
  actionMenuItemText: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  actionMenuItemDangerText: { fontSize: 16, color: Colors.error, fontWeight: '500' },
  actionMenuItemCancelText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', fontWeight: '600' },
});
