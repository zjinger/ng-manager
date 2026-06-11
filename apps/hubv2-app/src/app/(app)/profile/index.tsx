import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { Feather } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();

  const handleLogout = () => {
    signOut();
    router.replace('/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
          {t('tabs.profile')}
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
        {/* User info card */}
        <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <Text style={{ color: theme.primary, fontSize: 24, fontWeight: '700' }}>
                {(user?.nickname || user?.username || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>
                {user?.nickname || user?.username}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 2 }}>
                {user?.username}
              </Text>
              {user?.department && (
                <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 2 }}>
                  {user.department.name}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderWidth: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onPress={() => router.push('/profile/settings')}
          >
            <Text style={{ color: theme.text }}>{t('profile.settings')}</Text>
            <Feather name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: theme.danger + '10',
              borderColor: theme.danger + '20',
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderWidth: 1,
              alignItems: 'center',
              marginTop: 16,
            }}
            onPress={handleLogout}
          >
            <Text style={{ color: theme.danger, fontWeight: '500' }}>
              {t('auth.logout')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
