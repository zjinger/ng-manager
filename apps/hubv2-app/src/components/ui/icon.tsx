import React from 'react';
import { Text, type TextProps } from 'react-native';

// Simple emoji-based icon system
// Replace with @expo/vector-icons or react-native-svg for production

interface IconProps extends TextProps {
  name: string;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color = '#0f172a', style, ...props }: IconProps) {
  return (
    <Text style={[{ fontSize: size, color }, style]} {...props}>
      {name}
    </Text>
  );
}

// Common icons
export const Icons = {
  home: '🏠',
  issues: '🐛',
  rd: '🔬',
  docs: '📄',
  profile: '👤',
  search: '🔍',
  plus: '➕',
  close: '✕',
  check: '✓',
  back: '←',
  forward: '→',
  settings: '⚙️',
  bell: '🔔',
  star: '⭐',
  filter: '🔽',
  sort: '↕️',
  edit: '✏️',
  delete: '🗑️',
  upload: '📤',
  download: '📥',
  link: '🔗',
  clock: '🕐',
  warning: '⚠️',
  info: 'ℹ️',
  success: '✅',
  error: '❌',
};
