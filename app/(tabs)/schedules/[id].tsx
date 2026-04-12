import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { VisitSchedule, VisitSlot } from '@/types/database';
import { format, parse, addMinutes, isBefore, isAfter } from 'date-fns';
import DatePicker from '@/components/DatePicker';
import TimePicker from '@/components/TimePicker';
import * as Clipboard from 'expo-clipboard';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { GradientBackground } from '@/components/GradientBackground';

export default function ScheduleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [schedule, setSchedule] = useState<VisitSchedule | null>(null);
  const [slots, setSlots] = useState<VisitSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<VisitSlot | null>(null);
  const [editingMessage, setEditingMessage] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');
  const [slotDate, setSlotDate] = useState(new Date());
  const [slotStartTime, setSlotStartTime] = useState(new Date());
  const [slotEndTime, setSlotEndTime] = useState(new Date());
  const [slotDuration, setSlotDuration] = useState('60');
  const [slotMaxPeople, setSlotMaxPeople] = useState('1');
  const [slotIsSkipped, setSlotIsSkipped] = useState(false);

  const handleCopyId = async () => {
    if (!schedule?.id) return;
    try {
      await Clipboard.setStringAsync("https://lado-a-lado.vercel.app/schedule/" + schedule.id);
      Alert.alert('Copiado', 'Código da agenda copiado para a área de transferência.');
    } catch {
      Alert.alert('Erro', 'Não foi possível copiar o código.');
    }
  };

  useEffect(() => {
    if (id) {
      loadSchedule();
    }
  }, [id]);

  const loadSchedule = async () => {
    try {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('visit_schedules')
        .select('*')
        .eq('id', id)
        .single();

      if (scheduleError) throw scheduleError;
      setSchedule(scheduleData);

      const { data: slotsData, error: slotsError } = await supabase
        .from('visit_slots')
        .select('*')
        .eq('schedule_id', id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (slotsError) throw slotsError;
      setSlots(slotsData || []);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível carregar a agenda');
    } finally {
      setLoading(false);
    }
  };

  const openEditMessage = () => {
    setEditedMessage(schedule?.custom_message ?? '');
    setEditingMessage(true);
  };

  const saveMessage = async () => {
    if (!schedule) return;
    try {
      const { error } = await supabase
        .from('visit_schedules')
        .update({ custom_message: editedMessage.trim() || null })
        .eq('id', schedule.id);
      if (error) throw error;
      setEditingMessage(false);
      await loadSchedule();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar as instruções');
    }
  };

  const generateSlotsForDateRange = async () => {
    if (!schedule) return;

    const start = parse(schedule.start_date, 'yyyy-MM-dd', new Date());
    const end = parse(schedule.end_date, 'yyyy-MM-dd', new Date());
    const slotsToCreate: Omit<VisitSlot, 'id' | 'created_at' | 'updated_at'>[] = [];

    // Gerar slots para cada dia no intervalo
    for (let date = start; date <= end; date = addMinutes(date, 24 * 60)) {
      // Aqui você pode adicionar lógica para gerar slots automaticamente
      // Por enquanto, deixamos o usuário criar manualmente
    }

    Alert.alert('Info', 'Use o botão "+ Adicionar Slot" para criar slots manualmente');
  };

  const openSlotModal = (slot?: VisitSlot) => {
    if (slot) {
      setEditingSlot(slot);
      const date = parse(slot.date, 'yyyy-MM-dd', new Date());
      const time = parse(slot.start_time, 'HH:mm:ss', new Date());
      setSlotDate(date);
      setSlotStartTime(time);
      const endTime = addMinutes(time, slot.duration_minutes);
      setSlotEndTime(endTime);
      setSlotDuration(slot.duration_minutes.toString());
      setSlotMaxPeople(slot.max_people.toString());
      setSlotIsSkipped(slot.is_skipped);
    } else {
      setEditingSlot(null);
      if (schedule) {
        setSlotDate(parse(schedule.start_date, 'yyyy-MM-dd', new Date()));
      }
      const startTime = parse('09:00:00', 'HH:mm:ss', new Date());
      setSlotStartTime(startTime);
      const endTime = addMinutes(startTime, 60);
      setSlotEndTime(endTime);
      setSlotDuration('60');
      setSlotMaxPeople('1');
      setSlotIsSkipped(false);
    }
    setShowSlotModal(true);
  };

  const generateSlots = (startTime: Date, endTime: Date, durationMinutes: number, dateStr: string) => {
    const slots: Array<{ start_time: string; duration_minutes: number }> = [];
    let currentTime = startTime;
    const endDateTime = endTime;

    while (currentTime < endDateTime) {
      const slotEnd = addMinutes(currentTime, durationMinutes);
      const actualEnd = slotEnd > endDateTime ? endDateTime : slotEnd;
      const actualDuration = Math.round((actualEnd.getTime() - currentTime.getTime()) / (1000 * 60));

      if (actualDuration > 0) {
        slots.push({
          start_time: format(currentTime, 'HH:mm:ss'),
          duration_minutes: actualDuration,
        });
      }

      currentTime = slotEnd;
    }

    return slots;
  };

  const saveSlot = async () => {
    if (!schedule) return;

    const dateStr = format(slotDate, 'yyyy-MM-dd');

    // Validar se a data está no intervalo da agenda
    const scheduleStart = parse(schedule.start_date, 'yyyy-MM-dd', new Date());
    const scheduleEnd = parse(schedule.end_date, 'yyyy-MM-dd', new Date());
    
    if (isBefore(slotDate, scheduleStart) || isAfter(slotDate, scheduleEnd)) {
      Alert.alert('Erro', 'A data do slot deve estar dentro do período da agenda');
      return;
    }

    try {
      if (editingSlot) {
        // Edição individual - manter comportamento atual
        const startTimeStr = format(slotStartTime, 'HH:mm:ss');

        // Verificar sobreposição (se não for skipped)
        if (!slotIsSkipped) {
          const slotStart = new Date(`${dateStr}T${startTimeStr}`);
          const slotEnd = addMinutes(slotStart, parseInt(slotDuration));

          const overlappingSlots = slots.filter((s) => {
            if (s.is_skipped || s.date !== dateStr || s.id === editingSlot?.id) {
              return false;
            }

            const sStart = new Date(`${s.date}T${s.start_time}`);
            const sEnd = addMinutes(sStart, s.duration_minutes);

            return (
              (slotStart >= sStart && slotStart < sEnd) ||
              (slotEnd > sStart && slotEnd <= sEnd) ||
              (slotStart <= sStart && slotEnd >= sEnd)
            );
          });

          if (overlappingSlots.length > 0) {
            Alert.alert('Erro', 'Este horário sobrepõe outro slot existente');
            return;
          }
        }

        // Atualizar slot individual
        const { error } = await supabase
          .from('visit_slots')
          .update({
            date: dateStr,
            start_time: startTimeStr,
            duration_minutes: parseInt(slotDuration),
            max_people: parseInt(slotMaxPeople),
            is_skipped: slotIsSkipped,
          })
          .eq('id', editingSlot.id);

        if (error) throw error;
      } else {
        // Criação de múltiplos slots
        const startTimeStr = format(slotStartTime, 'HH:mm:ss');
        const endTimeStr = format(slotEndTime, 'HH:mm:ss');

        // Validar que o horário de fim é depois do início
        if (slotEndTime <= slotStartTime) {
          Alert.alert('Erro', 'O horário de fim deve ser posterior ao horário de início');
          return;
        }

        // Validar duração
        const duration = parseInt(slotDuration);
        if (isNaN(duration) || duration <= 0) {
          Alert.alert('Erro', 'A duração deve ser um número positivo');
          return;
        }

        // Combinar data com horários
        const startDateTime = new Date(`${dateStr}T${startTimeStr}`);
        const endDateTime = new Date(`${dateStr}T${endTimeStr}`);

        // Gerar slots automaticamente
        const slotsToCreate = generateSlots(startDateTime, endDateTime, duration, dateStr);

        if (slotsToCreate.length === 0) {
          Alert.alert('Erro', 'Não foi possível criar slots com os parâmetros informados');
          return;
        }

        // Verificar conflitos com slots existentes
        const existingSlotsOnDate = slots.filter((s) => s.date === dateStr && !s.is_skipped);
        const conflictingSlots: string[] = [];

        for (const slot of slotsToCreate) {
          const slotStart = new Date(`${dateStr}T${slot.start_time}`);
          const slotEnd = addMinutes(slotStart, slot.duration_minutes);

          for (const existing of existingSlotsOnDate) {
            const existingStart = new Date(`${existing.date}T${existing.start_time}`);
            const existingEnd = addMinutes(existingStart, existing.duration_minutes);

            if (
              (slotStart >= existingStart && slotStart < existingEnd) ||
              (slotEnd > existingStart && slotEnd <= existingEnd) ||
              (slotStart <= existingStart && slotEnd >= existingEnd)
            ) {
              conflictingSlots.push(`${slot.start_time.substring(0, 5)}`);
            }
          }
        }

        if (conflictingSlots.length > 0) {
          Alert.alert(
            'Conflito detectado',
            `Os seguintes horários conflitam com slots existentes: ${conflictingSlots.join(', ')}\n\nDeseja continuar mesmo assim? Os slots conflitantes não serão criados.`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Continuar',
                onPress: async () => {
                  await createSlotsWithoutConflicts(slotsToCreate, dateStr, existingSlotsOnDate);
                },
              },
            ]
          );
          return;
        }

        // Criar todos os slots
        const slotsData = slotsToCreate.map((slot) => ({
          schedule_id: schedule.id,
          date: dateStr,
          start_time: slot.start_time,
          duration_minutes: slot.duration_minutes,
          max_people: parseInt(slotMaxPeople),
          is_skipped: false,
        }));

        const { error } = await supabase.from('visit_slots').insert(slotsData);

        if (error) throw error;

        Alert.alert('Sucesso', `${slotsData.length} slot(s) criado(s) com sucesso!`);
      }

      setShowSlotModal(false);
      await loadSchedule();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar o slot');
    }
  };

  const createSlotsWithoutConflicts = async (
    slotsToCreate: Array<{ start_time: string; duration_minutes: number }>,
    dateStr: string,
    existingSlots: VisitSlot[]
  ) => {
    if (!schedule) return;

    const slotsData: Array<{
      schedule_id: string;
      date: string;
      start_time: string;
      duration_minutes: number;
      max_people: number;
      is_skipped: boolean;
    }> = [];

    for (const slot of slotsToCreate) {
      const slotStart = new Date(`${dateStr}T${slot.start_time}`);
      const slotEnd = addMinutes(slotStart, slot.duration_minutes);

      let hasConflict = false;
      for (const existing of existingSlots) {
        const existingStart = new Date(`${existing.date}T${existing.start_time}`);
        const existingEnd = addMinutes(existingStart, existing.duration_minutes);

        if (
          (slotStart >= existingStart && slotStart < existingEnd) ||
          (slotEnd > existingStart && slotEnd <= existingEnd) ||
          (slotStart <= existingStart && slotEnd >= existingEnd)
        ) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        slotsData.push({
          schedule_id: schedule.id,
          date: dateStr,
          start_time: slot.start_time,
          duration_minutes: slot.duration_minutes,
          max_people: parseInt(slotMaxPeople),
          is_skipped: false,
        });
      }
    }

    if (slotsData.length > 0) {
      const { error } = await supabase.from('visit_slots').insert(slotsData);
      if (error) throw error;
      Alert.alert('Sucesso', `${slotsData.length} slot(s) criado(s) com sucesso!`);
    } else {
      Alert.alert('Aviso', 'Nenhum slot foi criado devido a conflitos com slots existentes');
    }

    setShowSlotModal(false);
    await loadSchedule();
  };

  const deleteSlot = async (slotId: string) => {
    Alert.alert('Confirmar exclusão', 'Deseja realmente excluir este slot?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('visit_slots')
              .delete()
              .eq('id', slotId);

            if (error) throw error;

            await loadSchedule();
          } catch (error: any) {
            Alert.alert('Erro', error.message);
          }
        },
      },
    ]);
  };

  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, VisitSlot[]>);

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </GradientBackground>
    );
  }

  if (!schedule) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Agenda não encontrada</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/schedules')} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.eyebrow}>VISITAS</Text>
          <Text style={styles.title}>Agenda</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.scheduleInfo}>
          {schedule.name && (
            <Text style={styles.scheduleName}>{schedule.name}</Text>
          )}
          <Text style={styles.scheduleDate}>
            {format(parse(schedule.start_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}
            {schedule.end_date !== schedule.start_date &&
              ` - ${format(parse(schedule.end_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}`}
          </Text>
          <View style={styles.scheduleGuidRow}>
            <Text style={styles.scheduleGuid} numberOfLines={1}>
              Código: {schedule.id}
            </Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyId}>
              <Ionicons name="copy-outline" size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {editingMessage ? (
            <View style={styles.messageEditBox}>
              <Text style={styles.messageLabel}>Instruções para os Visitantes</Text>
              <MarkdownEditor
                value={editedMessage}
                onChange={setEditedMessage}
                placeholder="Digite orientações para os visitantes..."
                minHeight={120}
              />
              <View style={styles.messageEditActions}>
                <TouchableOpacity
                  style={styles.messageCancelButton}
                  onPress={() => setEditingMessage(false)}
                >
                  <Text style={styles.messageCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.messageSaveButton} onPress={saveMessage}>
                  <Text style={styles.messageSaveButtonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.messageBox}>
              <View style={styles.messageLabelRow}>
                <Text style={styles.messageLabel}>Instruções:</Text>
                <TouchableOpacity onPress={openEditMessage} style={styles.messageEditButton}>
                  <Text style={styles.messageEditButtonText}>
                    {schedule.custom_message ? 'Editar' : '+ Adicionar'}
                  </Text>
                </TouchableOpacity>
              </View>
              {schedule.custom_message ? (
                <MarkdownRenderer style={styles.messageText}>
                  {schedule.custom_message}
                </MarkdownRenderer>
              ) : (
                <Text style={styles.messageEmptyText}>Nenhuma instrução definida.</Text>
              )}
            </View>
          )}
        </View>

        {Object.keys(groupedSlots).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum slot criado ainda</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => openSlotModal()}
            >
              <Text style={styles.primaryButtonText}>Adicionar Primeiro Slot</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.entries(groupedSlots).map(([date, dateSlots]) => (
            <View key={date} style={styles.dateSection}>
              <Text style={styles.dateTitle}>
                {format(parse(date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}
              </Text>
              {dateSlots.map((slot) => (
                <View key={slot.id} style={styles.slotCard}>
                  <View style={styles.slotInfo}>
                    <Text style={styles.slotTime}>
                      {slot.start_time.substring(0, 5)} -{' '}
                      {format(
                        addMinutes(
                          parse(slot.start_time, 'HH:mm:ss', new Date()),
                          slot.duration_minutes
                        ),
                        'HH:mm'
                      )}
                    </Text>
                    <Text style={styles.slotDetails}>
                      Duração: {slot.duration_minutes} min • Máx: {slot.max_people} pessoas
                      {slot.is_skipped && ' • PULADO'}
                    </Text>
                  </View>
                  <View style={styles.slotActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openSlotModal(slot)}
                    >
                      <Text style={styles.editButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteSlot(slot.id)}
                    >
                      <Text style={styles.deleteButtonText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Botão flutuante de novo slot na parte inferior */}
      <View style={styles.fabContainer}>
        <BlurView intensity={80} tint="light" style={styles.fab}>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={() => openSlotModal()}
          >
            <Text style={styles.fabIcon}>+</Text>
            <Text style={styles.fabText}>Novo Slot</Text>
          </TouchableOpacity>
        </BlurView>
      </View>

      <Modal
        visible={showSlotModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSlotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={Keyboard.dismiss}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <BlurView intensity={80} tint="light" style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {editingSlot ? 'Editar Slot' : 'Novo Slot'}
                </Text>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.scrollContent}
                >
                  <DatePicker
                    label="Data"
                    value={slotDate}
                    onChange={setSlotDate}
                    minimumDate={schedule ? parse(schedule.start_date, 'yyyy-MM-dd', new Date()) : new Date()}
                    maximumDate={schedule ? parse(schedule.end_date, 'yyyy-MM-dd', new Date()) : undefined}
                  />

                  {editingSlot ? (
                    // Modo edição - campos individuais
                    <>
                      <TimePicker
                        label="Horário de Início"
                        value={slotStartTime}
                        onChange={setSlotStartTime}
                      />

                      <Text style={styles.label}>Duração (minutos)</Text>
                      <TextInput
                        style={styles.input}
                        value={slotDuration}
                        onChangeText={setSlotDuration}
                        keyboardType="numeric"
                      />

                      <Text style={styles.label}>Máximo de Pessoas</Text>
                      <TextInput
                        style={styles.input}
                        value={slotMaxPeople}
                        onChangeText={setSlotMaxPeople}
                        keyboardType="numeric"
                      />

                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => setSlotIsSkipped(!slotIsSkipped)}
                      >
                        <View style={[styles.checkbox, slotIsSkipped && styles.checkboxChecked]}>
                          {slotIsSkipped && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                        </View>
                        <Text style={styles.checkboxLabel}>Pular este slot (ex: almoço)</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    // Modo criação - múltiplos slots
                    <>
                      <TimePicker
                        label="Horário de Início"
                        value={slotStartTime}
                        onChange={setSlotStartTime}
                      />

                      <TimePicker
                        label="Horário de Fim"
                        value={slotEndTime}
                        onChange={setSlotEndTime}
                      />

                      <Text style={styles.label}>Duração (minutos)</Text>
                      <TextInput
                        style={styles.input}
                        value={slotDuration}
                        onChangeText={setSlotDuration}
                        keyboardType="numeric"
                        placeholder="Ex: 60"
                      />

                      <Text style={styles.label}>Máximo de Pessoas</Text>
                      <TextInput
                        style={styles.input}
                        value={slotMaxPeople}
                        onChangeText={setSlotMaxPeople}
                        keyboardType="numeric"
                        placeholder="Ex: 1"
                      />

                      <View style={styles.infoBox}>
                        <View style={styles.infoTextRow}>
                          <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
                          <Text style={styles.infoText}>
                            O aplicativo criará automaticamente múltiplos slots sequenciais dentro do período especificado, iniciando cada slot quando o anterior terminar.
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowSlotModal(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      saveSlot();
                    }}
                  >
                    <Text style={styles.saveButtonText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  backButtonText: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '600',
  },
  headerTitles: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scheduleInfo: {
    backgroundColor: Colors.glassBackground,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  scheduleName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  scheduleDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  scheduleGuidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  scheduleGuid: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  copyButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  messageBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.secondary + '20',
    borderRadius: 12,
  },
  messageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  messageEditButton: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: Colors.primary + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  messageEditButtonText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 14,
    color: Colors.text,
  },
  messageEmptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  messageEditBox: {
    marginTop: 12,
  },
  messageEditActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  messageCancelButton: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
    alignItems: 'center',
  },
  messageCancelButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  messageSaveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  messageSaveButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 200,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  dateSection: {
    marginBottom: 24,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  slotCard: {
    backgroundColor: Colors.glassBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  slotInfo: {
    flex: 1,
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  slotDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  slotActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.secondary,
    borderRadius: 6,
  },
  editButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.glassDark,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
    maxHeight: '90%',
    minHeight: 300,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    color: Colors.text,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.neutral,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  infoBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.secondary + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.secondary + '40',
  },
  infoTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 20,
    paddingBottom: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 40,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  fab: {
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: Colors.searchGlass,
    borderWidth: 1,
    borderColor: Colors.searchBorder,
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  fabIcon: {
    fontSize: 20,
    marginRight: 8,
    fontWeight: 'bold',
    color: Colors.text,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});

