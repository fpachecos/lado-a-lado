import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeRevenueCat } from '@/lib/revenuecat';

export default function RootLayout() {
  useEffect(() => {
    initializeRevenueCat();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

