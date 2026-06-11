import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { statusBadgeTokens } from '@/lib/theme';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';
type StatusVariant = 'inProgress' | 'pending' | 'verifying' | 'done' | 'blocked';

interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  status?: StatusVariant;
  label?: string;
  children?: React.ReactNode;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: '#9CA3AF20', text: '#6B7280' },
  primary: { bg: '#6366F120', text: '#6366F1' },
  success: { bg: '#10B98120', text: '#10B981' },
  warning: { bg: '#F59E0B20', text: '#F59E0B' },
  destructive: { bg: '#EF444420', text: '#EF4444' },
  info: { bg: '#3B82F620', text: '#3B82F6' },
};

export function Badge({ variant, status, label, children, className, style, ...props }: BadgeProps) {
  const { mode } = useTheme();

  let bgColor: string;
  let textColor: string;
  let borderColor: string | undefined;

  if (status) {
    const tokens = statusBadgeTokens[mode][status];
    bgColor = tokens.bg;
    textColor = tokens.text;
    borderColor = tokens.border;
  } else {
    const colors = variantColors[variant || 'default'];
    bgColor = colors.bg;
    textColor = colors.text;
  }

  return (
    <View
      style={[
        {
          backgroundColor: bgColor,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderWidth: borderColor ? 1 : 0,
          borderColor: borderColor,
        },
        style,
      ]}
      className={className}
      {...props}
    >
      <Text style={{ color: textColor, fontSize: 12, fontWeight: '500' }}>
        {label || children}
      </Text>
    </View>
  );
}
