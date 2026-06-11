import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-foreground text-lg font-semibold">
        {t('tabs.home')}
      </Text>
      <Text className="text-muted mt-2">
        Hub V2 Mobile
      </Text>
    </View>
  );
}
