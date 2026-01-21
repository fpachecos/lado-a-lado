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
import { VisitSchedule } from '@/types/database';
import { BlurView } from 'expo-blur';
import { format, parse } from 'date-fns';
import * as Clipboard from 'expo-clipboard';

export default function SchedulesScreen() {
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<VisitSchedule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const handleCopyId = async (id: string) => {
    try {
      await Clipboard.setStringAsync(id);
      Alert.alert('Copiado', 'Código da agenda copiado para a área de transferência.');
    } catch {
      Alert.alert('Erro', 'Não foi possível copiar o código.');
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

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
      setFilteredSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
      Alert.alert('Erro', 'Não foi possível carregar as agendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSchedules(schedules);
    } else {
      const search = searchQuery.toLowerCase();
      const filtered = schedules.filter((schedule) => {
        const nameMatch = schedule.name?.toLowerCase().includes(search);
        const idMatch = schedule.id.toLowerCase().includes(search);
        return nameMatch || idMatch;
      });
      setFilteredSchedules(filtered);
    }
  }, [searchQuery, schedules]);

  const handleDelete = async (scheduleId: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Deseja realmente excluir esta agenda?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('visit_schedules')
                .delete()
                .eq('id', scheduleId);

              if (error) throw error;

              await loadSchedules();
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  };

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
        <Text style={styles.title}>Agendas de Visitas</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Barra de busca */}
      <View style={styles.searchContainer}>
        <BlurView intensity={80} tint="light" style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar agendas..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </BlurView>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {filteredSchedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nenhuma agenda criada ainda
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(tabs)/schedules/new')}
            >
              <Text style={styles.primaryButtonText}>Criar Primeira Agenda</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredSchedules.map((schedule) => (
            <TouchableOpacity
              key={schedule.id}
              style={styles.scheduleCard}
              onPress={() => router.push(`/(tabs)/schedules/${schedule.id}`)}
            >
              <View style={styles.scheduleCardContent}>
                <View style={styles.scheduleInfo}>
                  {schedule.name && (
                    <Text style={styles.scheduleName} numberOfLines={1}>
                      {schedule.name}
                    </Text>
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
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCopyId(schedule.id);
                      }}
                    >
                      <Text style={styles.copyButtonText}>📋</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(schedule.id);
                  }}
                >
                  <Text style={styles.deleteButtonText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Botão flutuante de novo na parte inferior */}
      <View style={styles.fabContainer}>
        <BlurView intensity={80} tint="light" style={styles.fab}>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={() => router.push('/(tabs)/schedules/new')}
          >
            <Text style={styles.fabIcon}>✏️</Text>
            <Text style={styles.fabText}>Nova Agenda</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
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
    paddingBottom: 100,
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
  scheduleCard: {
    backgroundColor: Colors.glassBackground,
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  scheduleCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  scheduleInfo: {
    flex: 1,
    marginRight: 12,
  },
  scheduleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 6,
  },
  scheduleDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  scheduleGuidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 14,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
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
    fontSize: 18,
    marginRight: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});

