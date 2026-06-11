import React from 'react';
import { View, Text, type ViewProps } from 'react-native';

interface AvatarProps extends ViewProps {
  name?: string;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
};

const textSizeMap = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-2xl',
};

export function Avatar({ name, size = 'md', className, ...props }: AvatarProps) {
  const initial = (name || '?')[0].toUpperCase();

  return (
    <View
      className={`${sizeMap[size]} bg-primary-100 rounded-full items-center justify-center ${className ?? ''}`}
      {...props}
    >
      <Text className={`text-primary-600 font-bold ${textSizeMap[size]}`}>
        {initial}
      </Text>
    </View>
  );
}
