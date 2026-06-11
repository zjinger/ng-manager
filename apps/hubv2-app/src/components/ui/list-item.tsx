import React from 'react';
import { View, Text, TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { Feather } from '@expo/vector-icons';

interface ListItemProps extends TouchableOpacityProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  showChevron?: boolean;
  divider?: boolean;
}

export function ListItem({
  title,
  subtitle,
  left,
  right,
  showChevron = false,
  divider = true,
  style,
  ...props
}: ListItemProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: theme.surface,
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: theme.divider,
        },
        style,
      ]}
      activeOpacity={0.7}
      {...props}
    >
      {left && <View style={{ marginRight: 12 }}>{left}</View>}
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500' }}>{title}</Text>
        {subtitle && (
          <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      {right && <View style={{ marginLeft: 12 }}>{right}</View>}
      {showChevron && (
        <Feather name="chevron-right" size={20} color={theme.textMuted} style={{ marginLeft: 8 }} />
      )}
    </TouchableOpacity>
  );
}
