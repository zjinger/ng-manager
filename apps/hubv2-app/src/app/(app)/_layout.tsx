import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useTranslation } from 'react-i18next';

export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  const { t } = useTranslation();

  if (status !== 'signIn') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerTitle: t('tabs.home'),
        }}
      />
      <Tabs.Screen
        name="issues"
        options={{
          title: t('tabs.issues'),
          headerTitle: t('issues.title'),
        }}
      />
      <Tabs.Screen
        name="rd"
        options={{
          title: t('tabs.rd'),
          headerTitle: t('rd.title'),
        }}
      />
      <Tabs.Screen
        name="docs"
        options={{
          title: t('tabs.docs'),
          headerTitle: t('docs.title'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          headerTitle: t('profile.title'),
        }}
      />
    </Tabs>
  );
}
