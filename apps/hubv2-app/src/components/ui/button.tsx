import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '@/providers/theme-provider';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: { paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  md: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  lg: { paddingHorizontal: 24, paddingVertical: 14, fontSize: 16 },
};

export function Button({
  title,
  loading = false,
  icon,
  variant = 'primary',
  size = 'md',
  disabled,
  fullWidth,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.primary,
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        };
      case 'destructive':
        return {
          backgroundColor: theme.danger,
          borderWidth: 0,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.border,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
      case 'destructive':
        return '#FFFFFF';
      case 'secondary':
      case 'ghost':
      case 'outline':
        return theme.text;
    }
  };

  const sizeStyle = sizeStyles[size];

  return (
    <TouchableOpacity
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          opacity: isDisabled ? 0.5 : 1,
          ...getVariantStyles(),
          ...sizeStyle,
        },
        fullWidth && { width: '100%' },
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'destructive' ? 'white' : theme.text}
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={{ color: getTextColor(), fontWeight: '600', textAlign: 'center' }}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
