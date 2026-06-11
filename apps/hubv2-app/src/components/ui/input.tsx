import React from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

interface InputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  hint,
  containerClassName,
  className,
  editable = true,
  ...props
}: InputProps) {
  return (
    <View className={containerClassName}>
      {label && (
        <Text className="text-foreground text-sm font-medium mb-2">
          {label}
        </Text>
      )}
      <RNTextInput
        className={`bg-card border rounded-xl px-4 py-3.5 text-foreground text-base ${
          error ? 'border-destructive' : 'border-border'
        } ${!editable ? 'opacity-50' : ''} ${className ?? ''}`}
        placeholderTextColor="#94a3b8"
        editable={editable}
        {...props}
      />
      {error && (
        <Text className="text-destructive text-xs mt-1">{error}</Text>
      )}
      {hint && !error && (
        <Text className="text-muted text-xs mt-1">{hint}</Text>
      )}
    </View>
  );
}
