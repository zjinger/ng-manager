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
  const priorityLabel = getTodoPriorityLabel(item.priority);

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
      }}
      onPress={() => onPress(item)}
      activeOpacity={0.78}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View
          style={{
            backgroundColor: theme.surfaceElevated,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600' }}>
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
              fontWeight: '600',
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

        <Text style={{ color: theme.textMuted, fontSize: 12, marginLeft: 'auto' }} numberOfLines={1}>
          {item.assigneeName ?? formatTime(item.updatedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function getStatusColor(status: string, mode: 'dark' | 'light') {
  const tokens = statusBadgeTokens[mode];
  if (['blocked'].includes(status)) return tokens.blocked;
  if (['done', 'completed', 'closed', 'accepted', 'verified'].includes(status)) return tokens.done;
  if (['verifying', 'resolved'].includes(status)) return tokens.verifying;
  if (['in_progress', 'doing'].includes(status)) return tokens.inProgress;
  return tokens.pending;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}
