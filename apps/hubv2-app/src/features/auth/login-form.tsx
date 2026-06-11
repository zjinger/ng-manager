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
import { useTheme } from '@/providers/theme-provider';
import type { ApiErrorResponse } from '@/lib/api';

export function LoginForm() {
  const { t } = useTranslation();
  const { theme } = useTheme();
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
            <View style={{ backgroundColor: theme.primary }} className="w-20 h-20 rounded-2xl items-center justify-center mb-4">
              <Text className="text-white text-3xl font-bold">H2</Text>
            </View>
            <Text style={{ color: theme.text }} className="text-2xl font-bold">
              {t('auth.loginTitle')}
            </Text>
            <Text style={{ color: theme.textSecondary }} className="mt-2 text-center">
              {t('auth.loginSubtitle')}
            </Text>
          </View>

          {/* Form */}
          <View className="gap-5">
            <View>
              <Text style={{ color: theme.text }} className="text-sm font-medium mb-2">
                {t('auth.username')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.text,
                  borderRadius: 14,
                }}
                className="border px-4 py-3.5 text-base"
                placeholder={t('auth.username')}
                placeholderTextColor={theme.textMuted}
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
              <Text style={{ color: theme.text }} className="text-sm font-medium mb-2">
                {t('auth.password')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.text,
                  borderRadius: 14,
                }}
                className="border px-4 py-3.5 text-base"
                placeholder={t('auth.password')}
                placeholderTextColor={theme.textMuted}
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
                style={{
                  backgroundColor: remember ? theme.primary : theme.surface,
                  borderColor: remember ? theme.primary : theme.border,
                }}
                className="w-5 h-5 rounded border mr-2 items-center justify-center"
              >
                {remember && (
                  <Text className="text-white text-xs font-bold">✓</Text>
                )}
              </View>
              <Text style={{ color: theme.textSecondary }} className="text-sm">
                {t('auth.remember')}
              </Text>
            </TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity
              style={{ backgroundColor: theme.primary, borderRadius: 14 }}
              className="py-3.5 items-center mt-2"
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
