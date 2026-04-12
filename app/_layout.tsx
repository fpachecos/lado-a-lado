import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeRevenueCat } from '@/lib/revenuecat';
import { requestNotificationPermissions } from '@/lib/notifications';
import { Platform } from 'react-native';

export default function RootLayout() {
  useEffect(() => {
    initializeRevenueCat();
    if (Platform.OS !== 'web') {
      requestNotificationPermissions();
    }
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="convite" />
    </Stack>
  );
}

