import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  StyleSheet,
  type ViewStyle,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '@/providers/theme-provider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  height?: number | string;
  style?: ViewStyle;
}

export interface BottomSheetRef {
  close: () => void;
}

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ children, isOpen, onClose, height = '50%', style }, ref) => {
    const { theme } = useTheme();
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const context = useSharedValue(0);

    const sheetHeight =
      typeof height === 'string' ? (parseFloat(height) / 100) * SCREEN_HEIGHT : height;

    useImperativeHandle(ref, () => ({
      close: () => {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
        setTimeout(onClose, 300);
      },
    }));

    useEffect(() => {
      if (isOpen) {
        translateY.value = withTiming(SCREEN_HEIGHT - sheetHeight, { duration: 300 });
      } else {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
      }
    }, [isOpen, sheetHeight, translateY]);

    const gesture = Gesture.Pan()
      .onStart(() => {
        context.value = translateY.value;
      })
      .onUpdate((event) => {
        const newY = context.value + event.translationY;
        translateY.value = Math.max(SCREEN_HEIGHT - sheetHeight, newY);
      })
      .onEnd((event) => {
        if (event.translationY > sheetHeight * 0.3) {
          translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
          setTimeout(onClose, 300);
        } else {
          translateY.value = withTiming(SCREEN_HEIGHT - sheetHeight, { duration: 300 });
        }
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateY.value,
        [SCREEN_HEIGHT - sheetHeight, SCREEN_HEIGHT],
        [0.5, 0],
        Extrapolation.CLAMP
      ),
    }));

    if (!isOpen) return null;

    return (
      <View style={StyleSheet.absoluteFill}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: '#000' },
              backdropStyle,
            ]}
          />
        </TouchableWithoutFeedback>
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
                height: sheetHeight,
                backgroundColor: theme.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 8,
              },
              animatedStyle,
              style,
            ]}
          >
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.border,
                }}
              />
            </View>
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';
