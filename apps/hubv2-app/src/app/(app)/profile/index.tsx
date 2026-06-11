import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();

  const handleLogout = () => {
    signOut();
    router.replace('/login');
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 py-8">
        {/* User info card */}
        <View className="bg-card rounded-2xl p-6 border border-border mb-6">
          <View className="flex-row items-center">
            <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center mr-4">
              <Text className="text-primary-600 text-2xl font-bold">
                {(user?.nickname || user?.username || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-lg font-semibold">
                {user?.nickname || user?.username}
              </Text>
              <Text className="text-muted text-sm mt-1">
                {user?.username}
              </Text>
              {user?.department && (
                <Text className="text-muted text-sm mt-0.5">
                  {user.department.name}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="gap-3">
          <TouchableOpacity
            className="bg-card rounded-xl px-4 py-3.5 border border-border flex-row items-center justify-between"
            onPress={() => router.push('/profile/settings')}
          >
            <Text className="text-foreground">{t('profile.settings')}</Text>
            <Text className="text-muted">→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-destructive/10 rounded-xl px-4 py-3.5 border border-destructive/20 items-center mt-4"
            onPress={handleLogout}
          >
            <Text className="text-destructive font-medium">
              {t('auth.logout')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
