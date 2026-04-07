import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { GradientBackground } from '@/components/GradientBackground';

type Step = 'verifying' | 'set-password' | 'error';

export default function ConviteScreen() {
  const { token_hash, type } = useLocalSearchParams<{ token_hash: string; type: string }>();
  const [step, setStep] = useState<Step>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token_hash) {
      setErrorMsg('Link de convite inválido ou expirado.');
      setStep('error');
      return;
    }
    verifyToken();
  }, [token_hash]);

  const verifyToken = async () => {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: (type as any) ?? 'invite',
    });

    if (error) {
      setErrorMsg('Link de convite inválido ou expirado. Peça um novo convite.');
      setStep('error');
    } else {
      setStep('set-password');
    }
  };

  const handleSetPassword = async () => {
    if (password.length < 6) {
      Alert.alert('Senha muito curta', 'A senha precisa ter ao menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Senhas diferentes', 'As senhas precisam ser iguais.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível definir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.eyebrow}>bem-vindo ao</Text>
            <Text style={styles.title}>Lado a Lado</Text>

            {step === 'verifying' && (
              <>
                <Text style={styles.subtitle}>Verificando seu convite…</Text>
                <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 24 }} />
              </>
            )}

            {step === 'error' && (
              <>
                <Text style={styles.subtitle}>{errorMsg}</Text>
                <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
                  <Text style={styles.buttonText}>Ir para o login</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'set-password' && (
              <>
                <Text style={styles.subtitle}>Crie uma senha para acessar o app</Text>
                <View style={styles.card}>
                  <TextInput
                    style={styles.input}
                    placeholder="Nova senha"
                    placeholderTextColor={Colors.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmar senha"
                    placeholderTextColor={Colors.textTertiary}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSetPassword}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? 'Salvando…' : 'Entrar no app'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  content: { width: '100%' },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.cardWarm,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 14,
    padding: 15,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderWarm,
    color: Colors.text,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 50,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
