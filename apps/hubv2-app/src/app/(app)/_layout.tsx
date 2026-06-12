import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/theme-provider';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchDashboardHomeData } from '@/features/dashboard/dashboard-service';

type FeatherName = keyof typeof Feather.glyphMap;

export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const dashboardQuery = useQuery({
    queryKey: ['mobile', 'dashboard-home'],
    queryFn: fetchDashboardHomeData,
    enabled: status === 'signIn',
    staleTime: 30_000,
  });

  const stats = dashboardQuery.data?.dashboard.stats;

  if (status !== 'signIn') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primaryLight,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 3,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 6,
        },
        tabBarBadgeStyle: {
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          paddingHorizontal: 4,
          fontSize: 10,
          fontWeight: '600',
          lineHeight: 16,
          backgroundColor: theme.danger,
          color: theme.onPrimary,
        },
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingHorizontal: 8,
          paddingBottom: insets.bottom,
          paddingTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{
          title: t('tabs.todo'),
          tabBarIcon: ({ color }) => <TabIcon name="clipboard" color={color} />,
          tabBarBadge: formatTabBadge(stats?.todoTotal),
        }}
      />
      <Tabs.Screen
        name="todo/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarIcon: ({ color }) => <TabIcon name="message-circle" color={color} />,
          tabBarBadge: formatTabBadge(stats?.unreadMessages),
        }}
      />
      <Tabs.Screen
        name="messages/[messageType]/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: FeatherName; color: ColorValue }) {
  return <Feather name={name} size={20} color={String(color)} />;
}

function formatTabBadge(value: number | undefined): string | undefined {
  if (!value || value <= 0) return undefined;
  return value > 99 ? '99+' : String(value);
}
