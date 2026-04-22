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
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { format, subDays, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Baby, BabyDiaper } from '@/types/database';
import { GradientBackground } from '@/components/GradientBackground';
import DatePicker from '@/components/DatePicker';
import { useUserContext } from '@/lib/user-context';
import TimePicker from '@/components/TimePicker';
import {
  POOP_COLORS,
  PoopColorId,
  DiaperType,
  getPoopColor,
  isNormalPoop,
  detectPoopColorFromImage,
} from '@/lib/diaper-colors';

const DAYS_PER_PAGE = 3;

const TYPE_OPTIONS: { value: DiaperType; label: string; short: string }[] = [
  { value: 'pee',  label: 'Xixi',  short: 'Xi' },
  { value: 'poop', label: 'Cocô',  short: 'Co' },
  { value: 'both', label: 'Ambos', short: 'Am' },
];

function getDayLabel(dateStr: string): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === today) return 'Hoje';
  if (dateStr === yesterday) return 'Ontem';
  return format(parseISO(dateStr), "d 'de' MMMM", { locale: ptBR });
}

function hasPoop(type: DiaperType): boolean {
  return type === 'poop' || type === 'both';
}

export default function DiapersScreen() {
  const { effectiveUserId } = useUserContext();

  const [baby, setBaby] = useState<Baby | null>(null);
  const [babyId, setBabyId] = useState<string | null>(null);
  const [diapers, setDiapers] = useState<BabyDiaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [oldestLoadedDate, setOldestLoadedDate] = useState<Date | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDiaper, setEditingDiaper] = useState<BabyDiaper | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedDiaper, setSelectedDiaper] = useState<BabyDiaper | null>(null);

  const now = new Date();
  const [recordedDateTime, setRecordedDateTime] = useState<Date>(now);
  const [diaperType, setDiaperType] = useState<DiaperType>('pee');
  const [poopColor, setPoopColor] = useState<PoopColorId | null>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoDetected, setPhotoDetected] = useState(false);

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
        .select('*')
        .eq('user_id', effectiveUserId)
        .single();

      if (!babyData) { setLoading(false); return; }
      setBaby(babyData);
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
      console.error('Erro ao carregar fraldas:', e);
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
      console.error('Erro ao carregar mais fraldas:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [babyId, oldestLoadedDate, loadingMore, checkHasMore]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAddModal = () => {
    setEditingDiaper(null);
    setRecordedDateTime(new Date());
    setDiaperType('pee');
    setPoopColor(null);
    setPhotoUri(null);
    setPhotoDetected(false);
    setShowModal(true);
  };

  const openEditModal = (diaper: BabyDiaper) => {
    setEditingDiaper(diaper);
    setRecordedDateTime(new Date(diaper.recorded_at));
    setDiaperType(diaper.type);
    setPoopColor(diaper.poop_color as PoopColorId | null);
    setPhotoUri(null);
    setPhotoDetected(false);
    setShowModal(true);
  };

  const handleDiaperPress = (diaper: BabyDiaper) => {
    setSelectedDiaper(diaper);
    setShowActionMenu(true);
  };

  const handleDateChange = (newDate: Date) => {
    const updated = new Date(newDate);
    updated.setHours(recordedDateTime.getHours());
    updated.setMinutes(recordedDateTime.getMinutes());
    updated.setSeconds(0);
    setRecordedDateTime(updated);
  };

  const handleTimeChange = (newDate: Date) => {
    const updated = new Date(recordedDateTime);
    updated.setHours(newDate.getHours());
    updated.setMinutes(newDate.getMinutes());
    updated.setSeconds(0);
    setRecordedDateTime(updated);
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      if (Platform.OS === 'web') {
        window.alert('Permissão para acessar a galeria é necessária.');
      } else {
        Alert.alert('Permissão necessária', 'Permissão para acessar a galeria é necessária.');
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhotoUri(asset.uri);
      setAnalyzingPhoto(true);
      setPhotoDetected(false);
      try {
        const detected = await detectPoopColorFromImage(asset.uri, asset.base64 ?? null);
        if (detected) {
          setPoopColor(detected);
          setPhotoDetected(true);
        }
      } finally {
        setAnalyzingPhoto(false);
      }
    }
  };

  const handleSave = async () => {
    if (!baby) return;

    if (hasPoop(diaperType) && !poopColor) {
      if (Platform.OS === 'web') {
        window.alert('Selecione a cor do cocô.');
      } else {
        Alert.alert('Cor obrigatória', 'Selecione a cor do cocô.');
      }
      return;
    }

    setSaving(true);
    try {
      const payload = {
        recorded_at: recordedDateTime.toISOString(),
        type: diaperType,
        poop_color: hasPoop(diaperType) ? poopColor : null,
      };

      if (editingDiaper) {
        const { error } = await supabase.from('baby_diapers').update(payload).eq('id', editingDiaper.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('baby_diapers').insert({ baby_id: baby.id, ...payload });
        if (error) throw error;
      }

      setShowModal(false);
      await loadData();
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert('Não foi possível salvar a fralda.');
      } else {
        Alert.alert('Erro', 'Não foi possível salvar a fralda.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (diaper: BabyDiaper) => {
    const doDelete = async () => {
      const { error } = await supabase.from('baby_diapers').delete().eq('id', diaper.id);
      if (!error) setDiapers(prev => prev.filter(d => d.id !== diaper.id));
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Deseja excluir este registro de fralda?')) doDelete();
    } else {
      Alert.alert('Excluir fralda', 'Deseja excluir este registro?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // Agrupar por dia
  const grouped: Record<string, BabyDiaper[]> = {};
  for (const d of diapers) {
    const day = format(new Date(d.recorded_at), 'yyyy-MM-dd');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(d);
  }
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Resumo de hoje
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayDiapers = grouped[todayKey] || [];
  const todayCount = todayDiapers.length;
  const todayPoops = todayDiapers.filter(d => hasPoop(d.type));
  const todayNormalPoops = todayPoops.filter(d => d.poop_color && isNormalPoop(d.poop_color as PoopColorId));
  const normalPct = todayPoops.length > 0
    ? Math.round((todayNormalPoops.length / todayPoops.length) * 100)
    : null;
  const lastDiaper = todayDiapers[0];

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
            <Text style={styles.title}>Fraldas</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/diapers-report')} style={styles.reportButton}>
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
                <Text style={styles.summaryItemLabel}>fraldas</Text>
              </View>
              {lastDiaper && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {format(new Date(lastDiaper.recorded_at), 'HH:mm')}
                  </Text>
                  <Text style={styles.summaryItemLabel}>última às</Text>
                </View>
              )}
              {normalPct !== null && (
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: normalPct >= 80 ? Colors.success : Colors.error }]}>
                    {normalPct}%
                  </Text>
                  <Text style={styles.summaryItemLabel}>cocô normal</Text>
                </View>
              )}
            </View>
          </View>

          {/* Botão adicionar */}
          <TouchableOpacity style={styles.addButton} onPress={openAddModal} activeOpacity={0.7}>
            <Text style={styles.addButtonPlus}>+</Text>
            <Text style={styles.addButtonText}>Registrar fralda</Text>
          </TouchableOpacity>

          {/* Lista agrupada por dia */}
          {sortedDays.map(day => (
            <View key={day}>
              <Text style={styles.dayHeader}>{getDayLabel(day)}</Text>
              {grouped[day].map(diaper => {
                const color = diaper.poop_color ? getPoopColor(diaper.poop_color as PoopColorId) : null;
                const typeOpt = TYPE_OPTIONS.find(t => t.value === diaper.type)!;
                return (
                  <TouchableOpacity
                    key={diaper.id}
                    style={styles.diaperItem}
                    onPress={() => handleDiaperPress(diaper)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.diaperTime}>
                      {format(new Date(diaper.recorded_at), 'HH:mm')}
                    </Text>
                    {color && (
                      <View style={styles.colorInfo}>
                        <View style={[styles.colorDot, { backgroundColor: color.hex }]} />
                        <Text style={styles.colorLabel}>{color.label}</Text>
                        {!color.normal && (
                          <View style={styles.abnormalBadge}>
                            <Text style={styles.abnormalBadgeText}>Atenção</Text>
                          </View>
                        )}
                      </View>
                    )}
                    <View style={[
                      styles.typeBadge,
                      diaper.type === 'poop' && styles.typeBadgePoop,
                      diaper.type === 'both' && styles.typeBadgeBoth,
                    ]}>
                      <Text style={styles.typeBadgeText}>{typeOpt.short}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {diapers.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Nenhuma fralda registrada ainda.</Text>
              <Text style={styles.emptyStateSubtext}>Toque em "Registrar fralda" para começar.</Text>
            </View>
          )}

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
              <Text style={styles.modalTitle}>
                {editingDiaper ? 'Editar Fralda' : 'Registrar Fralda'}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Data e hora */}
                <Text style={styles.modalSectionLabel}>Data e hora</Text>
                <View style={styles.dateTimeRow}>
                  <View style={styles.datePickerWrapper}>
                    <DatePicker
                      value={recordedDateTime}
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                    />
                  </View>
                  <View style={styles.timePickerWrapper}>
                    <TimePicker value={recordedDateTime} onChange={handleTimeChange} />
                  </View>
                  <TouchableOpacity
                    style={styles.nowButton}
                    onPress={() => setRecordedDateTime(new Date())}
                  >
                    <Text style={styles.nowButtonText}>Agora</Text>
                  </TouchableOpacity>
                </View>

                {/* Tipo */}
                <Text style={styles.modalSectionLabel}>Tipo</Text>
                <View style={styles.typeSelector}>
                  {TYPE_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.typeOption, diaperType === opt.value && styles.typeOptionActive]}
                      onPress={() => {
                        setDiaperType(opt.value);
                        if (!hasPoop(opt.value)) setPoopColor(null);
                      }}
                    >
                      <Text style={[styles.typeOptionText, diaperType === opt.value && styles.typeOptionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Cor do cocô */}
                {hasPoop(diaperType) && (
                  <>
                    <Text style={styles.modalSectionLabel}>Cor do cocô</Text>

                    {/* Grade de cores */}
                    <View style={styles.colorGrid}>
                      {POOP_COLORS.map(color => (
                        <TouchableOpacity
                          key={color.id}
                          style={[
                            styles.colorSwatch,
                            poopColor === color.id && styles.colorSwatchSelected,
                            !color.normal && styles.colorSwatchAbnormal,
                          ]}
                          onPress={() => setPoopColor(color.id)}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.colorSwatchCircle, { backgroundColor: color.hex }]} />
                          <Text style={styles.colorSwatchNumber}>{color.cardNumber}</Text>
                          <Text style={styles.colorSwatchLabel} numberOfLines={2}>{color.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Botão foto */}
                    <View style={styles.photoRow}>
                      <TouchableOpacity
                        style={styles.photoButton}
                        onPress={handlePickPhoto}
                        disabled={analyzingPhoto}
                        activeOpacity={0.75}
                      >
                        {analyzingPhoto
                          ? <ActivityIndicator color={Colors.primary} size="small" />
                          : <Text style={styles.photoButtonText}>
                              {photoUri ? '🔄 Analisar outra foto' : '📷 Detectar cor por foto'}
                            </Text>
                        }
                      </TouchableOpacity>
                    </View>

                    {photoUri && !analyzingPhoto && (
                      <View style={styles.photoPreviewRow}>
                        <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                        <Text style={styles.photoHint}>
                          {photoDetected
                            ? 'Cor detectada automaticamente. Você pode alterar acima.'
                            : 'Não foi possível detectar a cor. Selecione manualmente acima.'}
                        </Text>
                      </View>
                    )}
                  </>
                )}

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

      {/* Menu de ações */}
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
            {selectedDiaper && (
              <Text style={styles.actionMenuSubtitle}>
                {format(new Date(selectedDiaper.recorded_at), 'HH:mm')} —{' '}
                {TYPE_OPTIONS.find(t => t.value === selectedDiaper.type)?.label}
              </Text>
            )}
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setShowActionMenu(false);
                if (selectedDiaper) openEditModal(selectedDiaper);
              }}
            >
              <Text style={styles.actionMenuItemText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionMenuItem, styles.actionMenuItemDanger]}
              onPress={() => {
                setShowActionMenu(false);
                if (selectedDiaper) handleDelete(selectedDiaper);
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.glass,
    borderWidth: 1, borderColor: Colors.glassBorder,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: { fontSize: 20, color: Colors.text, fontWeight: '600' },
  headerTitles: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  reportButton: {
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: Colors.glass,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  reportButtonText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  content: { paddingHorizontal: 18, paddingBottom: 40 },

  summaryCard: {
    backgroundColor: Colors.cardWarm,
    borderRadius: 24, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 16, elevation: 3,
  },
  summaryLabel: {
    fontSize: 11, fontWeight: '800', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14,
  },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  summaryItem: { width: '33%', alignItems: 'flex-start' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: Colors.primary, letterSpacing: -0.5 },
  summaryItemLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', marginTop: 2 },

  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 20, paddingVertical: 13, marginBottom: 20,
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
  },
  addButtonPlus: { fontSize: 20, color: Colors.primary, fontWeight: '700', lineHeight: 22 },
  addButtonText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },

  dayHeader: {
    fontSize: 11, fontWeight: '800', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4,
  },

  diaperItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cardWarm,
    borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarmLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  diaperTime: { fontSize: 15, fontWeight: '600', color: Colors.text, minWidth: 48 },
  colorInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  colorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  colorLabel: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary, flex: 1 },
  abnormalBadge: {
    backgroundColor: 'rgba(224,52,40,0.1)',
    borderRadius: 99, paddingVertical: 2, paddingHorizontal: 6,
    borderWidth: 1, borderColor: 'rgba(224,52,40,0.25)',
  },
  abnormalBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.error },

  typeBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.cardPrimary,
    borderWidth: 1, borderColor: Colors.borderPrimary,
    justifyContent: 'center', alignItems: 'center',
  },
  typeBadgePoop: { backgroundColor: 'rgba(204,193,130,0.2)', borderColor: 'rgba(204,193,130,0.5)' },
  typeBadgeBoth: { backgroundColor: 'rgba(168,213,186,0.2)', borderColor: Colors.borderMint },
  typeBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.text },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  emptyStateSubtext: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center' },

  loadMoreButton: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, marginTop: 4, marginBottom: 8,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  deleteHint: {
    textAlign: 'center', fontSize: 12, color: Colors.textTertiary, marginTop: 8, fontWeight: '500',
  },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalContent: {
    backgroundColor: Colors.glassDark,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 20, maxHeight: '90%',
    borderWidth: 1, borderColor: Colors.glassBorder, overflow: 'hidden',
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
    borderWidth: 1, borderColor: Colors.borderPrimary,
    paddingHorizontal: 10, minWidth: 52,
  },
  nowButtonText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  typeSelector: { flexDirection: 'row', gap: 8 },
  typeOption: {
    flex: 1, paddingVertical: 12, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass, alignItems: 'center',
  },
  typeOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.cardPrimary },
  typeOptionText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  typeOptionTextActive: { color: Colors.primary },

  // Color grid — 4 colunas
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorSwatch: {
    width: '22%',
    alignItems: 'center', gap: 4, padding: 8,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  colorSwatchSelected: { borderColor: Colors.primary, backgroundColor: Colors.cardPrimary },
  colorSwatchAbnormal: { borderColor: 'rgba(224,52,40,0.3)' },
  colorSwatchCircle: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 1,
  },
  colorSwatchNumber: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary },
  colorSwatchLabel: {
    fontSize: 10, fontWeight: '500', color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 13,
  },

  // Photo
  photoRow: { marginTop: 12 },
  photoButton: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderPrimary,
    backgroundColor: Colors.cardPrimary,
  },
  photoButtonText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  photoPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  photoPreview: { width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: Colors.glassBorder },
  photoHint: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  // Modal actions
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelButton: {
    flex: 1, paddingVertical: 15, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass, alignItems: 'center',
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
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  actionMenuContent: {
    backgroundColor: Colors.glassDark, borderRadius: 28, padding: 8,
    minWidth: 290, maxWidth: '88%',
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
