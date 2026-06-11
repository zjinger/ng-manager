import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/theme-provider';

export default function TodoScreen() {
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
          {t('tabs.todo')}
        </Text>
      </View>

      {/* Content placeholder */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.textSecondary }}>
          待办列表开发中...
        </Text>
      </View>
    </View>
  );
}
