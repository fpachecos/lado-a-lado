import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { GradientBackground } from '@/components/GradientBackground';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Erro ao fazer login', error.message);
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
            <Text style={styles.subtitle}>Acompanhamento especial</Text>

            <View style={styles.card}>
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Esqueci minha senha</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Não tem uma conta? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text style={styles.signupLink}>Cadastre-se</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
  },
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  linkButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
