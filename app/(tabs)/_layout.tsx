import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { UserProvider } from '@/lib/user-context';

export default function MainLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/(auth)/login');
      } else {
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/(auth)/login');
    } else {
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="baby" />
        <Stack.Screen name="schedules" />
        <Stack.Screen name="visits" />
        <Stack.Screen name="companion" />
        <Stack.Screen name="companion-activities" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="weight" />
        <Stack.Screen name="feedings" />
        <Stack.Screen name="feedings-report" />
        <Stack.Screen name="diapers" />
        <Stack.Screen name="diapers-report" />
        <Stack.Screen name="calendario" />
        <Stack.Screen name="paywall" />
      </Stack>
    </UserProvider>
  );
}

