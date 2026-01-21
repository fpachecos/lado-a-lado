import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Baby } from '@/types/database';
import { isPremiumUser } from '@/lib/revenuecat';
import { format } from 'date-fns';
import DatePicker from '@/components/DatePicker';

export default function NewScheduleScreen() {
  const [baby, setBaby] = useState<Baby | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar bebê
      const { data: babyData } = await supabase
        .from('babies')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setBaby(babyData);

      // Verificar premium
      const premium = await isPremiumUser();
      setIsPremium(premium);

      if (!premium) {
        setEndDate(startDate);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSave = async () => {
    // Validar datas usando formatação para comparação mais precisa
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    if (!isPremium && startDateStr !== endDateStr) {
      Alert.alert(
        'Plano Free',
        'Usuários do plano gratuito podem criar agendas apenas para 1 dia. Faça upgrade para criar agendas com múltiplos dias.',
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Fazer Upgrade',
            style: 'default',
            onPress: () => router.push('/(tabs)'),
          },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Criar agenda
      const { data: schedule, error: scheduleError } = await supabase
        .from('visit_schedules')
        .insert({
          user_id: user.id,
          name: scheduleName.trim() || null,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          custom_message: customMessage.trim() || null,
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      Alert.alert(
        'Agenda criada!',
        `Código da agenda: ${schedule.id}\n\nAgora você pode adicionar os slots de visita.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace(`/(tabs)/schedules/${schedule.id}`),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar a agenda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nova Agenda</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {baby && (
            <View style={styles.babyInfo}>
              <Text style={styles.babyInfoText}>
                {baby.name && `Bebê: ${baby.name}`}
                {baby.gender && ` • ${baby.gender === 'male' ? 'Menino' : 'Menina'}`}
              </Text>
            </View>
          )}

          <View style={styles.form}>
            <Text style={styles.label}>Nome da Agenda</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Visitas na Maternidade"
              placeholderTextColor={Colors.textSecondary}
              value={scheduleName}
              onChangeText={setScheduleName}
            />

            <DatePicker
              label="Data de Início"
              value={startDate}
              onChange={(date) => {
                setStartDate(date);
                if (!isPremium) {
                  setEndDate(date);
                }
              }}
              minimumDate={new Date()}
            />

            {isPremium && (
              <DatePicker
                label="Data de Término"
                value={endDate}
                onChange={setEndDate}
                minimumDate={startDate}
              />
            )}

            <Text style={styles.label}>Mensagem Personalizada (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Digite orientações para os visitantes..."
              placeholderTextColor={Colors.textSecondary}
              value={customMessage}
              onChangeText={setCustomMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={() => {
                Keyboard.dismiss();
                handleSave();
              }}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Criando...' : 'Criar Agenda'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  content: {
    padding: 20,
  },
  babyInfo: {
    backgroundColor: Colors.secondary + '30',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  babyInfoText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  form: {
    backgroundColor: Colors.glassBackground,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
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
  textArea: {
    minHeight: 120,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

