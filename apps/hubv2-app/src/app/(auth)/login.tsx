import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { LoginForm } from '@/features/auth/login-form';
import { View } from 'react-native';

export default function LoginScreen() {
  const status = useAuthStore((s) => s.status);

  if (status === 'signIn') {
    return <Redirect href="/" />;
  }

  return (
    <View className="flex-1 bg-background">
      <LoginForm />
    </View>
  );
}
