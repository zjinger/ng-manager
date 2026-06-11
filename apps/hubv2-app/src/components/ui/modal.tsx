import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  type ModalProps as RNModalProps,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface ModalProps extends RNModalProps {
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
}

export function Modal({
  title,
  onClose,
  children,
  visible,
  ...props
}: ModalProps) {
  return (
    <RNModal visible={visible} transparent animationType="fade" {...props}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center px-6"
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            className="bg-background rounded-2xl overflow-hidden"
            activeOpacity={1}
          >
            {title && (
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
                <Text className="text-foreground font-semibold text-lg flex-1">
                  {title}
                </Text>
                {onClose && (
                  <TouchableOpacity onPress={onClose} className="ml-2 p-1">
                    <Text className="text-muted text-lg">✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View className="p-4">{children}</View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </RNModal>
  );
}
