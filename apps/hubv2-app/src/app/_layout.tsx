import '../../global.css';
import '@/lib/i18n';

import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Providers } from '@/providers';
import { useAuthStore } from '@/features/auth/use-auth-store';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const status = useAuthStore((s) => s.status);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate().finally(() => setHydrated(true));
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && status !== 'idle') {
      SplashScreen.hideAsync();
    }
  }, [hydrated, status]);

  if (!hydrated || status === 'idle') {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400: Inter_400Regular,
    Inter_500: Inter_500Medium,
    Inter_600: Inter_600SemiBold,
    Inter_700: Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Providers>
      <StatusBar style="auto" />
      <RootLayoutNav />
    </Providers>
  );
}
