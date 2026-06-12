import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { statusBadgeTokens } from '@/lib/theme';
import type { MobileTodoItem } from './types';
import {
  getTodoPriorityLabel,
  getTodoStatusLabel,
  todoTypeLabels,
} from './types';

interface TodoCardProps {
  item: MobileTodoItem;
  onPress: (item: MobileTodoItem) => void;
}

export function TodoCard({ item, onPress }: TodoCardProps) {
  const { theme, mode } = useTheme();
  const statusColor = getStatusColor(item.status, mode);
  const typeColor = getTypeColor(item.targetType, theme);
  const priorityLabel = getTodoPriorityLabel(item.priority);
  const progressText = readProgressText(item.summary);

  return (
    <TouchableOpacity
      style={{
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 8,
        minHeight: 92,
      }}
      onPress={() => onPress(item)}
      activeOpacity={0.78}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View
          style={{
            backgroundColor: typeColor.bg,
            borderWidth: 1,
            borderColor: typeColor.border,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            flexShrink: 0,
          }}
        >
          <Text style={{ color: typeColor.text, fontSize: 11, fontWeight: '600' }}>
            {todoTypeLabels[item.targetType]}
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: 12,
              fontFamily: 'monospace',
              marginBottom: 3,
            }}
            numberOfLines={1}
          >
            {item.code}
          </Text>
          <Text
            style={{
            color: theme.text,
            fontSize: 14,
            fontWeight: '500',
            lineHeight: 20,
          }}
          numberOfLines={2}
          >
            {item.title}
          </Text>
        </View>
      </View>

      {!!item.summary && (
        <Text
          style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8 }}
          numberOfLines={2}
        >
          {item.summary}
        </Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <View
          style={{
            backgroundColor: statusColor.bg,
            borderWidth: 1,
            borderColor: statusColor.border,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: statusColor.text, fontSize: 11, fontWeight: '600' }}>
            {getTodoStatusLabel(item.status)}
          </Text>
        </View>

        {!!priorityLabel && (
          <Text style={{ color: theme.warning, fontSize: 12, fontWeight: '600' }}>
            {priorityLabel}
          </Text>
        )}

        {!!progressText && (
          <Text style={{ color: theme.textSecondary, fontSize: 12, fontVariant: ['tabular-nums'] }}>
            {progressText}
          </Text>
        )}

        {!!item.assigneeName && (
          <Text style={{ color: theme.textMuted, fontSize: 12, marginLeft: 'auto' }} numberOfLines={1}>
            {item.assigneeName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function getTypeColor(type: MobileTodoItem['targetType'], theme: ReturnType<typeof useTheme>['theme']) {
  if (type === 'rd') {
    return {
      bg: `${theme.success}26`,
      text: theme.success,
      border: `${theme.success}33`,
    };
  }

  return {
    bg: `${theme.primary}26`,
    text: theme.primaryLight,
    border: `${theme.primary}33`,
  };
}

function getStatusColor(status: string, mode: 'dark' | 'light') {
  const tokens = statusBadgeTokens[mode];
  if (['blocked'].includes(status)) return tokens.blocked;
  if (['done', 'completed', 'closed', 'accepted', 'verified'].includes(status)) return tokens.done;
  if (['verifying', 'resolved'].includes(status)) return tokens.verifying;
  if (['in_progress', 'doing'].includes(status)) return tokens.inProgress;
  return tokens.pending;
}

function readProgressText(summary: string | null): string | null {
  const match = summary?.match(/(\d{1,3})\s*%/);
  if (!match) return null;
  return `${Math.min(Math.max(Number(match[1]), 0), 100)}%`;
}
