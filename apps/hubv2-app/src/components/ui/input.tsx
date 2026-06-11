import React from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import { useTheme } from '@/providers/theme-provider';

interface InputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  editable = true,
  style,
  ...props
}: InputProps) {
  const { theme } = useTheme();

  return (
    <View>
      {label && (
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          {label}
        </Text>
      )}
      <RNTextInput
        style={[
          {
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: error ? theme.danger : theme.border,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: theme.text,
            fontSize: 16,
            opacity: editable ? 1 : 0.5,
          },
          style,
        ]}
        placeholderTextColor={theme.textMuted}
        editable={editable}
        {...props}
      />
      {error && (
        <Text style={{ color: theme.danger, fontSize: 12, marginTop: 4 }}>{error}</Text>
      )}
      {hint && !error && (
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>{hint}</Text>
      )}
    </View>
  );
}
