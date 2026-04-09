import React, { useEffect, useState, useCallback } from 'react';
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
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { format, subDays, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Baby, BabyFeeding } from '@/types/database';
import { GradientBackground } from '@/components/GradientBackground';
import DatePicker from '@/components/DatePicker';
import { useUserContext } from '@/lib/user-context';
import TimePicker from '@/components/TimePicker';

type Breast = 'left' | 'right' | 'both';

const BREAST_OPTIONS: { value: Breast; label: string; short: string }[] = [
  { value: 'left', label: 'Esquerdo', short: 'E' },
  { value: 'right', label: 'Direito', short: 'D' },
  { value: 'both', label: 'Ambos', short: 'A' },
];

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

export default function FeedingsScreen() {
  const { effectiveUserId } = useUserContext();

  const [baby, setBaby] = useState<Baby | null>(null);
  const [feedings, setFeedings] = useState<BabyFeeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingFeeding, setEditingFeeding] = useState<BabyFeeding | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedFeeding, setSelectedFeeding] = useState<BabyFeeding | null>(null);

  const now = new Date();
  const [startDateTime, setStartDateTime] = useState<Date>(now);
  const [endDateTime, setEndDateTime] = useState<Date>(now);
  const [breast, setBreast] = useState<Breast>('left');

  const loadData = useCallback(async () => {
    if (!effectiveUserId) return;
    try {
      const { data: babyData } = await supabase
        .from('babies')
        .select('*')
        .eq('user_id', effectiveUserId)
        .single();

      if (!babyData) { setLoading(false); return; }
      setBaby(babyData);

      const { data: feedingsData } = await supabase
        .from('baby_feedings')
        .select('*')
        .eq('baby_id', babyData.id)
        .order('started_at', { ascending: false });

      setFeedings(feedingsData || []);
    } catch (e) {
      console.error('Erro ao carregar mamadas:', e);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAddModal = () => {
    setEditingFeeding(null);
    const base = new Date();
    setStartDateTime(base);
    setEndDateTime(base);
    setBreast('left');
    setShowModal(true);
  };

  const openEditModal = (feeding: BabyFeeding) => {
    setEditingFeeding(feeding);
    setStartDateTime(new Date(feeding.started_at));
    setEndDateTime(new Date(feeding.ended_at));
    setBreast(feeding.breast);
    setShowModal(true);
  };

  const handleFeedingPress = (feeding: BabyFeeding) => {
    setSelectedFeeding(feeding);
    setShowActionMenu(true);
  };

  const handleStartDateChange = (newDate: Date) => {
    const updated = new Date(newDate);
    updated.setHours(startDateTime.getHours());
    updated.setMinutes(startDateTime.getMinutes());
    updated.setSeconds(0);
    setStartDateTime(updated);
  };

  const handleStartTimeChange = (newDate: Date) => {
    const updated = new Date(startDateTime);
    updated.setHours(newDate.getHours());
    updated.setMinutes(newDate.getMinutes());
    updated.setSeconds(0);
    setStartDateTime(updated);
  };

  const handleEndDateChange = (newDate: Date) => {
    const updated = new Date(newDate);
    updated.setHours(endDateTime.getHours());
    updated.setMinutes(endDateTime.getMinutes());
    updated.setSeconds(0);
    setEndDateTime(updated);
  };

  const handleEndTimeChange = (newDate: Date) => {
    const updated = new Date(endDateTime);
    updated.setHours(newDate.getHours());
    updated.setMinutes(newDate.getMinutes());
    updated.setSeconds(0);
    setEndDateTime(updated);
  };

  const setStartToNow = () => setStartDateTime(new Date());
  const setEndToNow = () => setEndDateTime(new Date());

  const handleSave = async () => {
    if (!baby) return;

    if (endDateTime <= startDateTime) {
      if (Platform.OS === 'web') {
        window.alert('O horário de fim deve ser após o horário de início.');
      } else {
        Alert.alert('Horário inválido', 'O horário de fim deve ser após o horário de início.');
      }
      return;
    }

    setSaving(true);
    try {
      if (editingFeeding) {
        const { error } = await supabase.from('baby_feedings').update({
          started_at: startDateTime.toISOString(),
          ended_at: endDateTime.toISOString(),
          breast,
        }).eq('id', editingFeeding.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('baby_feedings').insert({
          baby_id: baby.id,
          started_at: startDateTime.toISOString(),
          ended_at: endDateTime.toISOString(),
          breast,
        });
        if (error) throw error;
      }
      setShowModal(false);
      await loadData();
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert('Não foi possível salvar a mamada.');
      } else {
        Alert.alert('Erro', 'Não foi possível salvar a mamada.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (feeding: BabyFeeding) => {
    const doDelete = async () => {
      const { error } = await supabase.from('baby_feedings').delete().eq('id', feeding.id);
      if (!error) setFeedings(prev => prev.filter(f => f.id !== feeding.id));
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Deseja excluir esta mamada?')) doDelete();
    } else {
      Alert.alert('Excluir mamada', 'Deseja excluir esta mamada?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // Agrupa por dia local (mais recente primeiro)
  const grouped: Record<string, BabyFeeding[]> = {};
  for (const f of feedings) {
    const day = format(new Date(f.started_at), 'yyyy-MM-dd');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(f);
  }
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Resumo de hoje
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayFeedings = grouped[todayKey] || [];
  const todayCount = todayFeedings.length;
  const todayAvg = todayCount > 0
    ? Math.round(todayFeedings.reduce((sum, f) => sum + differenceInMinutes(new Date(f.ended_at), new Date(f.started_at)), 0) / todayCount)
    : 0;

  // Intervalo médio entre mamadas do dia (início → início)
  const todayFeedingsSorted = todayCount > 1
    ? [...todayFeedings].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
    : [];
  const todayAvgInterval = todayFeedingsSorted.length > 1
    ? Math.round(
        todayFeedingsSorted.slice(1).reduce((sum, f, i) =>
          sum + differenceInMinutes(new Date(f.started_at), new Date(todayFeedingsSorted[i].started_at)), 0
        ) / (todayFeedingsSorted.length - 1)
      )
    : 0;

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
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Mamadas</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/feedings-report')} style={styles.reportButton}>
            <Text style={styles.reportButtonText}>Relatórios</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Resumo de hoje */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Hoje</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{todayCount}</Text>
                <Text style={styles.summaryItemLabel}>mamadas</Text>
              </View>
              {todayCount > 0 && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{formatDuration(todayAvg)}</Text>
                  <Text style={styles.summaryItemLabel}>duração média</Text>
                </View>
              )}
              {todayCount > 0 && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {format(new Date(todayFeedings[0].started_at), 'HH:mm')}
                  </Text>
                  <Text style={styles.summaryItemLabel}>última às</Text>
                </View>
              )}
              {todayCount > 1 && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{formatDuration(todayAvgInterval)}</Text>
                  <Text style={styles.summaryItemLabel}>intervalo médio</Text>
                </View>
              )}
            </View>
          </View>

          {/* Botão adicionar */}
          <TouchableOpacity style={styles.addButton} onPress={openAddModal} activeOpacity={0.7}>
            <Text style={styles.addButtonPlus}>+</Text>
            <Text style={styles.addButtonText}>Registrar mamada</Text>
          </TouchableOpacity>

          {/* Lista agrupada por dia */}
          {sortedDays.map(day => {
            const dayFeedings = grouped[day];
            return (
              <View key={day}>
                <Text style={styles.dayHeader}>{getDayLabel(day)}</Text>
                {dayFeedings.map(feeding => {
                  const duration = differenceInMinutes(new Date(feeding.ended_at), new Date(feeding.started_at));
                  const breastOption = BREAST_OPTIONS.find(b => b.value === feeding.breast);
                  return (
                    <TouchableOpacity
                      key={feeding.id}
                      style={styles.feedingItem}
                      onPress={() => handleFeedingPress(feeding)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.feedingTimeBlock}>
                        <Text style={styles.feedingTime}>
                          {format(new Date(feeding.started_at), 'HH:mm')}
                        </Text>
                        <Text style={styles.feedingTimeSep}>→</Text>
                        <Text style={styles.feedingTime}>
                          {format(new Date(feeding.ended_at), 'HH:mm')}
                        </Text>
                      </View>
                      <Text style={styles.feedingDuration}>{formatDuration(duration)}</Text>
                      <View style={[styles.breastBadge, feeding.breast === 'both' && styles.breastBadgeBoth]}>
                        <Text style={styles.breastBadgeText}>{breastOption?.short}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}

          {feedings.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Nenhuma mamada registrada ainda.</Text>
              <Text style={styles.emptyStateSubtext}>Toque em "Registrar mamada" para começar.</Text>
            </View>
          )}

          <Text style={styles.deleteHint}>Toque em um registro para editar ou excluir</Text>
        </View>
      </ScrollView>

      {/* Modal de registro */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={80} tint="light" style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editingFeeding ? 'Editar Mamada' : 'Registrar Mamada'}</Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Início */}
                <Text style={styles.modalSectionLabel}>Início</Text>
                <View style={styles.dateTimeRow}>
                  <View style={styles.datePickerWrapper}>
                    <DatePicker
                      value={startDateTime}
                      onChange={handleStartDateChange}
                      maximumDate={new Date()}
                    />
                  </View>
                  <View style={styles.timePickerWrapper}>
                    <TimePicker value={startDateTime} onChange={handleStartTimeChange} />
                  </View>
                  <TouchableOpacity style={styles.nowButton} onPress={setStartToNow}>
                    <Text style={styles.nowButtonText}>Agora</Text>
                  </TouchableOpacity>
                </View>

                {/* Fim */}
                <Text style={styles.modalSectionLabel}>Fim</Text>
                <View style={styles.dateTimeRow}>
                  <View style={styles.datePickerWrapper}>
                    <DatePicker
                      value={endDateTime}
                      onChange={handleEndDateChange}
                      maximumDate={new Date()}
                    />
                  </View>
                  <View style={styles.timePickerWrapper}>
                    <TimePicker value={endDateTime} onChange={handleEndTimeChange} />
                  </View>
                  <TouchableOpacity style={styles.nowButton} onPress={setEndToNow}>
                    <Text style={styles.nowButtonText}>Agora</Text>
                  </TouchableOpacity>
                </View>

                {/* Seio */}
                <Text style={styles.modalSectionLabel}>Seio</Text>
                <View style={styles.breastSelector}>
                  {BREAST_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.breastOption, breast === opt.value && styles.breastOptionActive]}
                      onPress={() => setBreast(opt.value)}
                    >
                      <Text style={[styles.breastOptionText, breast === opt.value && styles.breastOptionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>

              {/* Ações */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowModal(false)}
                  disabled={saving}
                >
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
      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.actionMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <BlurView intensity={80} tint="light" style={styles.actionMenuContent}>
            <View style={styles.modalHandle} />
            {selectedFeeding && (
              <Text style={styles.actionMenuSubtitle}>
                {format(new Date(selectedFeeding.started_at), 'HH:mm')} → {format(new Date(selectedFeeding.ended_at), 'HH:mm')}
              </Text>
            )}
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setShowActionMenu(false);
                if (selectedFeeding) openEditModal(selectedFeeding);
              }}
            >
              <Text style={styles.actionMenuItemText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionMenuItem, styles.actionMenuItemDanger]}
              onPress={() => {
                setShowActionMenu(false);
                if (selectedFeeding) handleDelete(selectedFeeding);
              }}
            >
              <Text style={styles.actionMenuItemDangerText}>Excluir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionMenuItem, styles.actionMenuItemCancel]}
              onPress={() => setShowActionMenu(false)}
            >
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
  },
  backButtonText: { fontSize: 20, color: Colors.text, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  reportButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  reportButtonText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Content
  content: { paddingHorizontal: 18, paddingBottom: 40 },

  // Summary card
  summaryCard: {
    backgroundColor: Colors.cardWarm,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  summaryItem: { width: '50%', alignItems: 'flex-start' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: Colors.primary, letterSpacing: -0.5 },
  summaryItemLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', marginTop: 2 },

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 20,
    paddingVertical: 13,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  addButtonPlus: { fontSize: 20, color: Colors.primary, fontWeight: '700', lineHeight: 22 },
  addButtonText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },

  // Day header
  dayHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },

  // Feeding item
  feedingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardWarm,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarmLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  feedingTimeBlock: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  feedingTime: { fontSize: 15, fontWeight: '600', color: Colors.text },
  feedingTimeSep: { fontSize: 13, color: Colors.textTertiary },
  feedingDuration: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: 12,
  },
  breastBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.cardPrimary,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breastBadgeBoth: {
    backgroundColor: 'rgba(168, 213, 186, 0.2)',
    borderColor: Colors.borderMint,
  },
  breastBadgeText: { fontSize: 12, fontWeight: '800', color: Colors.primary },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  emptyStateSubtext: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center' },

  deleteHint: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalContent: {
    backgroundColor: Colors.glassDark,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
  },

  // Date + time row
  dateTimeRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  datePickerWrapper: { flex: 1.4 },
  timePickerWrapper: { flex: 1 },
  nowButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    paddingHorizontal: 10,
    minWidth: 52,
  },
  nowButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Breast selector
  breastSelector: { flexDirection: 'row', gap: 8 },
  breastOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
    alignItems: 'center',
  },
  breastOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.cardPrimary,
  },
  breastOptionText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  breastOptionTextActive: { color: Colors.primary },

  // Modal actions
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  saveButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Action menu
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenuContent: {
    backgroundColor: Colors.glassDark,
    borderRadius: 28,
    padding: 8,
    minWidth: 290,
    maxWidth: '88%',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  actionMenuSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  actionMenuItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral,
  },
  actionMenuItemDanger: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral,
  },
  actionMenuItemCancel: {
    borderBottomWidth: 0,
    marginTop: 4,
    marginBottom: 4,
  },
  actionMenuItemText: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  actionMenuItemDangerText: { fontSize: 16, color: Colors.error, fontWeight: '500' },
  actionMenuItemCancelText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', fontWeight: '600' },
});
