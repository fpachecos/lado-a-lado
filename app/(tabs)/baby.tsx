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
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Baby } from '@/types/database';
import { GradientBackground } from '@/components/GradientBackground';
import DatePicker from '@/components/DatePicker';
import { parseISO } from 'date-fns';
import { useUserContext } from '@/lib/user-context';

export default function BabyScreen() {
  const { effectiveUserId } = useUserContext();

  const [baby, setBaby] = useState<Baby | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
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

      if (baby) {
        // Atualizar
        const { error } = await supabase
          .from('babies')
          .update({
            name: name.trim(),
            gender,
            birth_date: birthDateStr,
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
          });

        if (error) throw error;
      }

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
        <Text style={styles.title}>Informações do Bebê</Text>
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
              <Text
                style={[
                  styles.genderButtonText,
                  gender === 'male' && styles.genderButtonTextActive,
                ]}
              >
                👶 Menino
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'female' && styles.genderButtonActive,
              ]}
              onPress={() => setGender('female')}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  gender === 'female' && styles.genderButtonTextActive,
                ]}
              >
                👶 Menina
              </Text>
            </TouchableOpacity>
          </View>

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
  genderButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
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
});

