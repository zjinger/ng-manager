import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/theme-provider';

export default function MessagesScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

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
          {t('tabs.messages')}
        </Text>
      </View>

      {/* Content placeholder */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.textSecondary }}>
          消息中心开发中...
        </Text>
      </View>
    </View>
  );
}
