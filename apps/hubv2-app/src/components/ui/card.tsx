import React from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

const cardVariants = tv({
  base: 'bg-card border border-border rounded-2xl',
  variants: {
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    padding: 'md',
  },
});

type CardVariants = VariantProps<typeof cardVariants>;

interface CardProps extends ViewProps, CardVariants {
  className?: string;
}

export function Card({ padding, className, children, ...props }: CardProps) {
  return (
    <View className={cardVariants({ padding, className })} {...props}>
      {children}
    </View>
  );
}
