import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/features/auth/use-auth-store';

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === 'signIn') {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
