import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function RdDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-foreground text-lg">RD #{id}</Text>
    </View>
  );
}
