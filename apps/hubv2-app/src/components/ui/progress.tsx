import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { useTheme } from '@/providers/theme-provider';

interface ProgressProps extends ViewProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const sizeMap = {
  sm: 4,
  md: 8,
  lg: 12,
};

export function Progress({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  color,
  style,
  ...props
}: ProgressProps) {
  const { theme } = useTheme();
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const progressColor = color || theme.primary;
  const height = sizeMap[size];

  return (
    <View style={[{ width: '100%' }, style]} {...props}>
      {showLabel && (
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
          {Math.round(percentage)}%
        </Text>
      )}
      <View
        style={{
          width: '100%',
          height,
          backgroundColor: theme.border,
          borderRadius: height / 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: progressColor,
            borderRadius: height / 2,
          }}
        />
      </View>
    </View>
  );
}
