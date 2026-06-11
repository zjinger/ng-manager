import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { useTheme } from '@/providers/theme-provider';

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  time?: string;
  icon?: string;
  color?: string;
}

interface TimelineProps extends ViewProps {
  items: TimelineItem[];
}

export function Timeline({ items, style, ...props }: TimelineProps) {
  const { theme } = useTheme();

  return (
    <View style={[{ paddingLeft: 16 }, style]} {...props}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const dotColor = item.color || theme.primary;

        return (
          <View key={item.id} style={{ flexDirection: 'row', marginBottom: isLast ? 0 : 16 }}>
            {/* Timeline line and dot */}
            <View style={{ alignItems: 'center', width: 24, marginRight: 12 }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: dotColor,
                  borderWidth: 2,
                  borderColor: theme.surface,
                }}
              />
              {!isLast && (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    backgroundColor: theme.border,
                    marginTop: 4,
                  }}
                />
              )}
            </View>

            {/* Content */}
            <View style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>
                {item.title}
              </Text>
              {item.description && (
                <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {item.description}
                </Text>
              )}
              {item.time && (
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                  {item.time}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
