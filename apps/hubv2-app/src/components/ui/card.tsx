import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/providers/theme-provider';

interface CardProps extends ViewProps {
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 24,
};

export function Card({ padding = 'md', className, children, style, ...props }: CardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderRadius: 16,
          borderWidth: 1,
          padding: paddingMap[padding],
        },
        style,
      ]}
      className={className}
      {...props}
    >
      {children}
    </View>
  );
}
