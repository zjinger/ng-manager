import React from 'react';
import { View, Text } from 'react-native';

interface EmptyListProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyList({
  title = '暂无数据',
  description,
  icon,
}: EmptyListProps) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      {icon || (
        <View className="w-16 h-16 bg-muted/20 rounded-full items-center justify-center mb-4">
          <Text className="text-muted text-2xl">📭</Text>
        </View>
      )}
      <Text className="text-foreground font-medium text-base">{title}</Text>
      {description && (
        <Text className="text-muted text-sm mt-1 text-center">{description}</Text>
      )}
    </View>
  );
}
