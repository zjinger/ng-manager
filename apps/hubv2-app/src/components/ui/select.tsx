import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal as RNModal,
  FlatList,
  type ViewProps,
} from 'react-native';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends ViewProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = '请选择',
  error,
  className,
  ...props
}: SelectProps) {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View className={className} {...props}>
      {label && (
        <Text className="text-foreground text-sm font-medium mb-2">
          {label}
        </Text>
      )}
      <TouchableOpacity
        className={`bg-card border rounded-xl px-4 py-3.5 flex-row items-center justify-between ${
          error ? 'border-destructive' : 'border-border'
        }`}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text className={selectedLabel ? 'text-foreground' : 'text-muted'}>
          {selectedLabel || placeholder}
        </Text>
        <Text className="text-muted">▼</Text>
      </TouchableOpacity>
      {error && (
        <Text className="text-destructive text-xs mt-1">{error}</Text>
      )}

      <RNModal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center px-6"
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View className="bg-background rounded-2xl max-h-96 overflow-hidden">
            <View className="px-4 py-3 border-b border-border">
              <Text className="text-foreground font-semibold text-lg">
                {label || placeholder}
              </Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`px-4 py-3 border-b border-border/50 ${
                    item.value === value ? 'bg-primary-50' : ''
                  }`}
                  onPress={() => {
                    onChange(item.value);
                    setVisible(false);
                  }}
                >
                  <Text
                    className={`${
                      item.value === value
                        ? 'text-primary-600 font-medium'
                        : 'text-foreground'
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </RNModal>
    </View>
  );
}
