import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface Props {
  message?: string;
}

export function PremiumGateBanner({ message = 'Desbloqueie o histórico completo' }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={18} color={Colors.primary} />
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(tabs)/paywall' as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Ver planos</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardPrimary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
