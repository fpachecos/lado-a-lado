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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Companion } from '@/types/database';
import { GradientBackground } from '@/components/GradientBackground';
import { useUserContext } from '@/lib/user-context';

export default function CompanionEditScreen() {
  const { effectiveUserId } = useUserContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [companion, setCompanion] = useState<Companion | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!isNew);

  useEffect(() => {
    if (!isNew) {
      loadCompanion();
    }
  }, [id]);

  const loadCompanion = async () => {
    try {
      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setCompanion(data);
        setName(data.name);
      }
    } catch (error) {
      console.error('Error loading companion:', error);
      Alert.alert('Erro', 'Não foi possível carregar as informações do acompanhante');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do acompanhante');
      return;
    }

    setLoading(true);
    try {
      if (!effectiveUserId) return;

      if (isNew) {
        const { error } = await supabase
          .from('companions')
          .insert({ user_id: effectiveUserId, name: name.trim() });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('companions')
          .update({ name: name.trim() })
          .eq('id', id);

        if (error) throw error;
      }

      if (Platform.OS === 'web') {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Sucesso', 'Acompanhante salvo com sucesso!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar o acompanhante');
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
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isNew ? 'Novo Acompanhante' : 'Editar Acompanhante'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Nome do Acompanhante</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome"
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={setName}
          />

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
    </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
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
    marginTop: 4,
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
