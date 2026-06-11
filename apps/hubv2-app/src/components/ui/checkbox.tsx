import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface CheckboxProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
  className,
}: CheckboxProps) {
  return (
    <TouchableOpacity
      className={`flex-row items-center ${className ?? ''}`}
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View
        className={`w-5 h-5 rounded border items-center justify-center mr-2 ${
          checked
            ? 'bg-primary-600 border-primary-600'
            : 'border-border bg-card'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        {checked && (
          <Text className="text-white text-xs font-bold">✓</Text>
        )}
      </View>
      {label && (
        <Text className={`text-foreground text-sm ${disabled ? 'opacity-50' : ''}`}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
