import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-foreground text-lg">{t('profile.settings')}</Text>
    </View>
  );
}
