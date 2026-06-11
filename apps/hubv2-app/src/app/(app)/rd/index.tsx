import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function RdScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-foreground text-lg">{t('rd.title')}</Text>
    </View>
  );
}
