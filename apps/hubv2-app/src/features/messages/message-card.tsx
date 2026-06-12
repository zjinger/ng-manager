import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import type { MobileMessageCategory, MobileMessageItem } from './types';
import { messageCategoryLabels } from './types';

interface MessageCardProps {
  item: MobileMessageItem;
  onPress: (item: MobileMessageItem) => void;
}

export function MessageCard({ item, onPress }: MessageCardProps) {
  const { theme } = useTheme();
  const color = getCategoryColor(item.category, theme);
  const author = getMessageAuthor(item);

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={() => onPress(item)}
      style={{
        flexDirection: 'row',
        gap: 12,
        backgroundColor: item.unread ? `${theme.primary}0D` : theme.surface,
        borderWidth: 1,
        borderLeftWidth: item.unread ? 3 : 1,
        borderColor: item.unread ? `${theme.primary}4D` : theme.border,
        borderLeftColor: item.unread ? theme.primary : theme.border,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 8,
        minHeight: 92,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: color.solid,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Text style={{ color: theme.onPrimary, fontSize: 15, fontWeight: '700' }}>
          {author[0]}
        </Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 }} numberOfLines={1}>
            {author}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 11, flexShrink: 0 }}>
            {formatRelativeTime(item.time)}
          </Text>
        </View>
        <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }} numberOfLines={2}>
          {item.title}
          {item.description ? `：${item.description}` : ''}
        </Text>
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: color.bg,
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
            marginTop: 6,
          }}
        >
          <Text style={{ color: color.text, fontSize: 10, fontWeight: '700' }}>
            {messageCategoryLabels[item.category] ?? messageCategoryLabels.all}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getMessageAuthor(item: MobileMessageItem): string {
  if (item.messageType === 'notification') return item.category === 'issue' || item.category === 'rd' ? '协作通知' : '系统通知';
  return messageCategoryLabels[item.category] ?? '系统通知';
}

function getCategoryColor(category: MobileMessageCategory, theme: ReturnType<typeof useTheme>['theme']) {
  if (category === 'rd') {
    return { solid: theme.success, bg: `${theme.success}1F`, text: theme.success };
  }
  if (category === 'announcement') {
    return { solid: theme.warning, bg: `${theme.warning}1F`, text: theme.warning };
  }
  if (category === 'document') {
    return { solid: theme.info, bg: `${theme.info}1F`, text: theme.info };
  }
  if (category === 'release') {
    return { solid: theme.primaryDark, bg: `${theme.primary}1F`, text: theme.primaryLight };
  }
  return { solid: theme.primary, bg: `${theme.primary}1F`, text: theme.primaryLight };
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const now = Date.now();
  const time = date.getTime();
  if (Number.isNaN(time)) return value;

  const minutes = Math.max(Math.floor((now - time) / 60000), 0);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}
