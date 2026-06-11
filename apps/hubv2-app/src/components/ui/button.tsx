import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

const buttonVariants = tv({
  base: 'flex-row items-center justify-center rounded-xl',
  variants: {
    variant: {
      primary: 'bg-primary-600',
      secondary: 'bg-card border border-border',
      destructive: 'bg-destructive',
      ghost: 'bg-transparent',
      outline: 'bg-transparent border border-border',
    },
    size: {
      sm: 'px-3 py-2',
      md: 'px-4 py-3',
      lg: 'px-6 py-3.5',
    },
    disabled: {
      true: 'opacity-50',
    },
    fullWidth: {
      true: 'w-full',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

const buttonTextVariants = tv({
  base: 'font-semibold text-center',
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'text-foreground',
      destructive: 'text-white',
      ghost: 'text-foreground',
      outline: 'text-foreground',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type ButtonVariants = VariantProps<typeof buttonVariants>;

interface ButtonProps extends TouchableOpacityProps, ButtonVariants {
  title: string;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export function Button({
  title,
  loading = false,
  icon,
  variant,
  size,
  disabled,
  fullWidth,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      className={buttonVariants({ variant, size, disabled: isDisabled, fullWidth, className })}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'destructive' ? 'white' : '#0f172a'}
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text className={buttonTextVariants({ variant, size, className: textClassName })}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
