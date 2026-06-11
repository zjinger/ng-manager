import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

const textVariants = tv({
  base: 'text-foreground',
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    color: {
      default: 'text-foreground',
      muted: 'text-muted',
      primary: 'text-primary-600',
      destructive: 'text-destructive',
      white: 'text-white',
    },
  },
  defaultVariants: {
    size: 'base',
    weight: 'normal',
    color: 'default',
  },
});

type TextVariants = VariantProps<typeof textVariants>;

interface TextProps extends RNTextProps, TextVariants {
  className?: string;
}

export function Text({
  size,
  weight,
  color,
  className,
  children,
  ...props
}: TextProps) {
  return (
    <RNText
      className={textVariants({ size, weight, color, className })}
      {...props}
    >
      {children}
    </RNText>
  );
}
