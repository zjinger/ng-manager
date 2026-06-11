import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onClear?: () => void;
}

export function SearchBar({
  placeholder = '搜索',
  value: controlledValue,
  onChange,
  onSubmit,
  onClear,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('');
  const value = controlledValue ?? internalValue;

  const handleChange = useCallback(
    (text: string) => {
      setInternalValue(text);
      onChange?.(text);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange?.('');
    onClear?.();
  }, [onChange, onClear]);

  return (
    <View className="flex-row items-center bg-card border border-border rounded-xl px-3">
      <Text className="text-muted mr-2">🔍</Text>
      <TextInput
        className="flex-1 py-2.5 text-foreground text-base"
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={handleChange}
        onSubmitEditing={() => onSubmit?.(value)}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} className="ml-2 p-1">
          <Text className="text-muted">✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
