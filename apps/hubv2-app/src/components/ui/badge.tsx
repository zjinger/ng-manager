import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

const badgeVariants = tv({
  base: 'px-2 py-0.5 rounded-full',
  variants: {
    variant: {
      default: 'bg-muted/20',
      primary: 'bg-primary-100',
      success: 'bg-green-100',
      warning: 'bg-yellow-100',
      destructive: 'bg-red-100',
      info: 'bg-blue-100',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const badgeTextVariants = tv({
  base: 'text-xs font-medium',
  variants: {
    variant: {
      default: 'text-muted',
      primary: 'text-primary-700',
      success: 'text-green-700',
      warning: 'text-yellow-700',
      destructive: 'text-red-700',
      info: 'text-blue-700',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type BadgeVariants = VariantProps<typeof badgeVariants>;

interface BadgeProps extends ViewProps, BadgeVariants {
  label: string;
}

export function Badge({ label, variant, className, ...props }: BadgeProps) {
  return (
    <View className={badgeVariants({ variant, className })} {...props}>
      <Text className={badgeTextVariants({ variant })}>{label}</Text>
    </View>
  );
}
