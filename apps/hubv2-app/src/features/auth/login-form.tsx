import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './use-auth-store';
import { useRouter } from 'expo-router';
import type { ApiErrorResponse } from '@/lib/api';

export function LoginForm() {
  const { t } = useTranslation();
  const signIn = useAuthStore((s) => s.signIn);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  const handleLogin = useCallback(async () => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername) {
      Alert.alert(t('common.error'), t('auth.username') + ' ' + t('common.required'));
      return;
    }
    if (!trimmedPassword) {
      Alert.alert(t('common.error'), t('auth.password') + ' ' + t('common.required'));
      return;
    }

    try {
      await signIn(trimmedUsername, trimmedPassword, remember);
      router.replace('/');
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      const message = apiError?.message || t('auth.loginError');
      Alert.alert(t('common.error'), message);
    }
  }, [username, password, remember, signIn, router, t]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo / Title */}
          <View className="items-center mb-10">
            <View className="w-20 h-20 bg-primary-600 rounded-2xl items-center justify-center mb-4">
              <Text className="text-white text-3xl font-bold">H2</Text>
            </View>
            <Text className="text-foreground text-2xl font-bold">
              {t('auth.loginTitle')}
            </Text>
            <Text className="text-muted mt-2 text-center">
              {t('auth.loginSubtitle')}
            </Text>
          </View>

          {/* Form */}
          <View className="gap-5">
            <View>
              <Text className="text-foreground text-sm font-medium mb-2">
                {t('auth.username')}
              </Text>
              <TextInput
                className="bg-card border border-border rounded-xl px-4 py-3.5 text-foreground text-base"
                placeholder={t('auth.username')}
                placeholderTextColor="#94a3b8"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                editable={!isLoading}
                returnKeyType="next"
              />
            </View>

            <View>
              <Text className="text-foreground text-sm font-medium mb-2">
                {t('auth.password')}
              </Text>
              <TextInput
                className="bg-card border border-border rounded-xl px-4 py-3.5 text-foreground text-base"
                placeholder={t('auth.password')}
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            {/* Remember me */}
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => setRemember(!remember)}
              disabled={isLoading}
            >
              <View
                className={`w-5 h-5 rounded border mr-2 items-center justify-center ${
                  remember
                    ? 'bg-primary-600 border-primary-600'
                    : 'border-border bg-card'
                }`}
              >
                {remember && (
                  <Text className="text-white text-xs font-bold">✓</Text>
                )}
              </View>
              <Text className="text-muted text-sm">{t('auth.remember')}</Text>
            </TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity
              className="bg-primary-600 rounded-xl py-3.5 items-center mt-2"
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  {t('auth.login')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
