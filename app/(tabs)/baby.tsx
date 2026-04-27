import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Baby } from '@/types/database';
import { GradientBackground } from '@/components/GradientBackground';
import DatePicker from '@/components/DatePicker';
import { parseISO } from 'date-fns';
import { useUserContext } from '@/lib/user-context';
import { cancelFeedingReminder, cancelMilestoneNotifications } from '@/lib/notifications';
import { usePremium } from '@/lib/usePremium';

export default function BabyScreen() {
  const { effectiveUserId } = useUserContext();
  const { isPremium } = usePremium();

  const [baby, setBaby] = useState<Baby | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [feedingNotifEnabled, setFeedingNotifEnabled] = useState(false);
  const [feedingNotifHours, setFeedingNotifHours] = useState(3);
  const [milestoneNotifEnabled, setMilestoneNotifEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (effectiveUserId) loadBaby();
  }, [effectiveUserId]);

  const loadBaby = async () => {
    if (!effectiveUserId) return;
    try {
      const { data, error } = await supabase
        .from('babies')
        .select('*')
        .eq('user_id', effectiveUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setBaby(data);
        setName(data.name || '');
        setGender(data.gender);
        setBirthDate(data.birth_date ? parseISO(data.birth_date) : null);
        setFeedingNotifEnabled(data.feeding_notification_enabled ?? false);
        setFeedingNotifHours(data.feeding_notification_hours ?? 3);
        setMilestoneNotifEnabled(data.milestone_notification_enabled ?? false);
      }
    } catch (error) {
      console.error('Error loading baby:', error);
      Alert.alert('Erro', 'Não foi possível carregar as informações do bebê');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do bebê');
      return;
    }

    setLoading(true);
    try {
      if (!effectiveUserId) return;

      const birthDateStr = birthDate ? birthDate.toISOString().split('T')[0] : null;

      const notifPayload = {
        feeding_notification_enabled: feedingNotifEnabled,
        feeding_notification_hours: feedingNotifHours,
        milestone_notification_enabled: milestoneNotifEnabled,
      };

      if (baby) {
        // Atualizar
        const { error } = await supabase
          .from('babies')
          .update({
            name: name.trim(),
            gender,
            birth_date: birthDateStr,
            ...notifPayload,
          })
          .eq('id', baby.id);

        if (error) throw error;
      } else {
        // Criar
        const { error } = await supabase
          .from('babies')
          .insert({
            user_id: effectiveUserId,
            name: name.trim(),
            gender,
            birth_date: birthDateStr,
            ...notifPayload,
          });

        if (error) throw error;
      }

      // Cancela notificações desabilitadas
      if (!feedingNotifEnabled) cancelFeedingReminder();
      if (!milestoneNotifEnabled) cancelMilestoneNotifications();

      router.replace('/(tabs)');
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Não foi possível salvar as informações');
      } else {
        Alert.alert('Erro', error.message || 'Não foi possível salvar as informações');
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.eyebrow}>BEBÊ</Text>
          <Text style={styles.title}>Informações do Bebê</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Nome do Bebê</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome"
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Data de Nascimento</Text>
          <DatePicker
            value={birthDate ?? new Date()}
            onChange={(date) => setBirthDate(date)}
            maximumDate={new Date()}
          />

          <Text style={styles.label}>Sexo</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'male' && styles.genderButtonActive,
              ]}
              onPress={() => setGender('male')}
            >
              <View style={styles.genderButtonInner}>
                <Ionicons name="male-outline" size={16} color={gender === 'male' ? Colors.white : Colors.textSecondary} />
                <Text style={[styles.genderButtonText, gender === 'male' && styles.genderButtonTextActive]}>Menino</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'female' && styles.genderButtonActive,
              ]}
              onPress={() => setGender('female')}
            >
              <View style={styles.genderButtonInner}>
                <Ionicons name="female-outline" size={16} color={gender === 'female' ? Colors.white : Colors.textSecondary} />
                <Text style={[styles.genderButtonText, gender === 'female' && styles.genderButtonTextActive]}>Menina</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: 24 }]}>Notificações</Text>

          <View style={styles.notifRow}>
            <View style={styles.notifInfo}>
              <Text style={styles.notifTitle}>Lembrete de mamada</Text>
              <Text style={styles.notifSubtitle}>
                Avisa 15 min antes de completar o intervalo
              </Text>
            </View>
            <Switch
              value={feedingNotifEnabled}
              onValueChange={setFeedingNotifEnabled}
              trackColor={{ false: Colors.neutral, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          {feedingNotifEnabled && (
            <View style={styles.hoursRow}>
              <Text style={styles.hoursLabel}>Intervalo entre mamadas</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setFeedingNotifHours(h => Math.max(1, h - 1))}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{feedingNotifHours}h</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setFeedingNotifHours(h => Math.min(8, h + 1))}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isPremium ? (
            <View style={[styles.notifRow, { marginTop: 12 }]}>
              <View style={styles.notifInfo}>
                <Text style={styles.notifTitle}>Marcos do desenvolvimento</Text>
                <Text style={styles.notifSubtitle}>
                  Avisa quando uma nova fase estiver próxima
                </Text>
              </View>
              <Switch
                value={milestoneNotifEnabled}
                onValueChange={setMilestoneNotifEnabled}
                trackColor={{ false: Colors.neutral, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.milestoneGate}
              onPress={() => router.push('/(tabs)/paywall' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.milestoneGateLeft}>
                <Ionicons name="lock-closed" size={16} color={Colors.primary} />
                <View style={styles.notifInfo}>
                  <Text style={styles.notifTitle}>Marcos do desenvolvimento</Text>
                  <Text style={styles.notifSubtitle}>
                    Avisa quando uma nova fase estiver próxima
                  </Text>
                </View>
              </View>
              <Text style={styles.milestoneGateLink}>Premium →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
    padding: 20,
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
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
    alignItems: 'center',
  },
  genderButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genderButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  genderButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  genderButtonTextActive: {
    color: Colors.primary,
    fontWeight: '600',
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
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  notifInfo: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  notifSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.glass,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 4,
  },
  hoursLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '700',
    lineHeight: 24,
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 32,
    textAlign: 'center',
  },
  milestoneGate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    backgroundColor: Colors.cardPrimary,
    gap: 10,
  },
  milestoneGateLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  milestoneGateLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});

