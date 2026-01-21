import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { VisitSchedule, VisitSlot, VisitBooking } from '@/types/database';
import { format, parse } from 'date-fns';
import { BlurView } from 'expo-blur';

interface SlotWithBookings extends VisitSlot {
  bookings: VisitBooking[];
  totalPeople: number;
}

export default function VisitsScreen() {
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [slotsWithBookings, setSlotsWithBookings] = useState<SlotWithBookings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, []);

  useEffect(() => {
    if (selectedScheduleId) {
      loadBookings();
    }
  }, [selectedScheduleId]);

  const loadSchedules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('visit_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSchedules(data || []);
      if (data && data.length > 0 && !selectedScheduleId) {
        setSelectedScheduleId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
      Alert.alert('Erro', 'Não foi possível carregar as agendas');
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    if (!selectedScheduleId) return;

    try {
      // Carregar slots da agenda
      const { data: slots, error: slotsError } = await supabase
        .from('visit_slots')
        .select('*')
        .eq('schedule_id', selectedScheduleId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (slotsError) throw slotsError;

      // Carregar bookings para cada slot
      const slotsWithBookingsData: SlotWithBookings[] = await Promise.all(
        (slots || []).map(async (slot) => {
          const { data: bookings, error: bookingsError } = await supabase
            .from('visit_bookings')
            .select('*')
            .eq('slot_id', slot.id);

          if (bookingsError) throw bookingsError;

          const totalPeople = (bookings || []).reduce(
            (sum, booking) => sum + booking.number_of_people,
            0
          );

          return {
            ...slot,
            bookings: bookings || [],
            totalPeople,
          };
        })
      );

      setSlotsWithBookings(slotsWithBookingsData);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível carregar as visitas');
    }
  };

  const groupedSlots = slotsWithBookings.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, SlotWithBookings[]>);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com botão de voltar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Gestão de Visitas</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Barra de busca */}
      <View style={styles.searchContainer}>
        <BlurView intensity={80} tint="light" style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar visitas..."
            placeholderTextColor={Colors.textSecondary}
          />
        </BlurView>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {schedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nenhuma agenda criada ainda
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(tabs)/schedules')}
            >
              <Text style={styles.primaryButtonText}>Criar Agenda</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.scheduleSelector}>
              <Text style={styles.selectorLabel}>Selecione a agenda:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {schedules.map((schedule) => (
                  <TouchableOpacity
                    key={schedule.id}
                    style={[
                      styles.scheduleChip,
                      selectedScheduleId === schedule.id && styles.scheduleChipActive,
                    ]}
                    onPress={() => setSelectedScheduleId(schedule.id)}
                  >
                    <Text
                      style={[
                        styles.scheduleChipText,
                        selectedScheduleId === schedule.id && styles.scheduleChipTextActive,
                      ]}
                    >
                      {format(parse(schedule.start_date, 'yyyy-MM-dd', new Date()), 'dd/MM')}
                      {schedule.end_date !== schedule.start_date &&
                        ` - ${format(parse(schedule.end_date, 'yyyy-MM-dd', new Date()), 'dd/MM')}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {Object.keys(groupedSlots).length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Nenhum slot criado nesta agenda
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => router.push(`/(tabs)/schedules/${selectedScheduleId}`)}
                >
                  <Text style={styles.primaryButtonText}>Adicionar Slots</Text>
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
                      <View style={styles.slotHeader}>
                        <Text style={styles.slotTime}>
                          {slot.start_time.substring(0, 5)}
                        </Text>
                        <View style={styles.slotStats}>
                          <Text style={styles.slotStatsText}>
                            {slot.totalPeople}/{slot.max_people} pessoas
                          </Text>
                          {slot.is_skipped && (
                            <Text style={styles.skippedBadge}>PULADO</Text>
                          )}
                        </View>
                      </View>

                      {slot.bookings.length > 0 ? (
                        <View style={styles.bookingsList}>
                          {slot.bookings.map((booking) => (
                            <View key={booking.id} style={styles.bookingItem}>
                              <Text style={styles.bookingName}>
                                {booking.visitor_name}
                              </Text>
                              <Text style={styles.bookingPeople}>
                                {booking.number_of_people}{' '}
                                {booking.number_of_people === 1 ? 'pessoa' : 'pessoas'}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.noBookingsText}>
                          Nenhuma visita confirmada
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.text,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.searchGlass,
    borderWidth: 1,
    borderColor: Colors.searchBorder,
    overflow: 'hidden',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  scheduleSelector: {
    marginBottom: 24,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  scheduleChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.neutral,
    marginRight: 8,
  },
  scheduleChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  scheduleChipText: {
    fontSize: 14,
    color: Colors.text,
  },
  scheduleChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: Colors.glassBackground,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
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
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  slotTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  slotStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotStatsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  skippedBadge: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
  bookingsList: {
    marginTop: 8,
  },
  bookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.secondary + '20',
    borderRadius: 8,
    marginBottom: 8,
  },
  bookingName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  bookingPeople: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  noBookingsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
});

