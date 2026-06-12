import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/theme-provider';
import type { ApiErrorResponse } from '@/lib/api/client';
import { fetchMessages, markMessagesRead } from './message-service';
import { MessageCard } from './message-card';
import {
  messageCategoryLabels,
  type MobileMessageCategory,
  type MobileMessageItem,
} from './types';

const categories: MobileMessageCategory[] = ['all', 'issue', 'rd', 'announcement', 'document', 'release'];

export function MessageListScreen() {
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<MobileMessageCategory>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const messagesQuery = useQuery({
    queryKey: ['mobile', 'messages', category, unreadOnly],
    queryFn: () => fetchMessages({ category, unreadOnly, page: 1, pageSize: 20 }),
  });
  const items = useMemo(() => messagesQuery.data?.items ?? [], [messagesQuery.data?.items]);

  const readMutation = useMutation({
    mutationFn: () => markMessagesRead({ all: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mobile', 'messages'] });
      void queryClient.invalidateQueries({ queryKey: ['mobile', 'dashboard-home'] });
    },
    onError: (error) => Alert.alert('标记已读失败', readApiError(error)),
  });

  const handlePressItem = (item: MobileMessageItem) => {
    if (item.unread && item.messageType === 'notification') {
      markMessagesRead({ notificationIds: [item.id] })
        .then(() => {
          void queryClient.invalidateQueries({ queryKey: ['mobile', 'messages'] });
          void queryClient.invalidateQueries({ queryKey: ['mobile', 'dashboard-home'] });
        })
        .catch(() => {});
    }
    router.push({
      pathname: '/(app)/messages/[messageType]/[id]',
      params: { messageType: item.messageType, id: item.id },
    });
  };

  const activeBackground = mode === 'dark' ? `${theme.primary}26` : theme.primary;
  const activeText = mode === 'dark' ? theme.primaryLight : theme.onPrimary;
  const activeBorder = mode === 'dark' ? `${theme.primary}4D` : theme.primary;
  const unreadTotal = messagesQuery.data?.unreadTotal ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          height: 56 + insets.top,
          paddingTop: insets.top,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.background,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>消息</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => setUnreadOnly((value) => !value)}>
            <Text style={{ color: unreadOnly ? theme.primaryLight : theme.textSecondary, fontSize: 13, fontWeight: '600' }}>
              {unreadOnly ? '全部消息' : '只看未读'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={readMutation.isPending || unreadTotal === 0}
            onPress={() => readMutation.mutate()}
            style={{ opacity: unreadTotal === 0 ? 0.45 : 1 }}
          >
            <Text style={{ color: theme.primaryLight, fontSize: 13, fontWeight: '600' }}>
              {readMutation.isPending ? '处理中' : '全部已读'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ height: 42, flexGrow: 0, flexShrink: 0 }}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          height: 42,
          paddingHorizontal: 16,
          paddingBottom: 12,
          gap: 6,
          alignItems: 'center',
        }}
      >
        {categories.map((item) => {
          const active = category === item;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => setCategory(item)}
              style={{
                height: 30,
                paddingHorizontal: 14,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: active ? activeBorder : theme.border,
                backgroundColor: active ? activeBackground : theme.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: active ? activeText : theme.textSecondary, fontSize: 13, fontWeight: active ? '600' : '400' }}>
                {messageCategoryLabels[item]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 88 + insets.bottom, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={messagesQuery.isRefetching}
            tintColor={theme.primary}
            colors={[theme.primary]}
            onRefresh={() => messagesQuery.refetch()}
          />
        }
      >
        {messagesQuery.isLoading && <CenteredState icon="loader" title="正在加载消息..." />}
        {messagesQuery.isError && (
          <ErrorState message={readApiError(messagesQuery.error)} onRetry={() => messagesQuery.refetch()} />
        )}
        {messagesQuery.isSuccess && items.length === 0 && (
          <CenteredState icon="message-circle" title={unreadOnly ? '暂无未读消息' : '暂无消息'} />
        )}
        {messagesQuery.isSuccess && items.map((item) => (
          <MessageCard key={`${item.messageType}:${item.id}`} item={item} onPress={handlePressItem} />
        ))}
      </ScrollView>
    </View>
  );
}

function CenteredState({ icon, title }: { icon: keyof typeof Feather.glyphMap; title: string }) {
  const { theme } = useTheme();
  const loading = icon === 'loader';

  return (
    <View style={{ flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      {loading ? <ActivityIndicator color={theme.primary} size="large" /> : <Feather name={icon} size={30} color={theme.textMuted} />}
      <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{title}</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Feather name="alert-circle" size={30} color={theme.danger} />
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>消息加载失败</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>{message}</Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{ backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 }}
      >
        <Text style={{ color: theme.onPrimary, fontSize: 14, fontWeight: '600' }}>重试</Text>
      </TouchableOpacity>
    </View>
  );
}

function readApiError(error: unknown): string {
  if (isApiError(error)) return error.message;
  return '请检查登录态和服务器连接后重试';
}

function isApiError(error: unknown): error is ApiErrorResponse {
  return typeof error === 'object' && error !== null && 'message' in error && 'statusCode' in error;
}
