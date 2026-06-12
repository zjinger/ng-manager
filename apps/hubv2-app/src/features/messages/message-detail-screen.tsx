import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/theme-provider';
import type { ApiErrorResponse } from '@/lib/api/client';
import { fetchMessageDetail, markMessagesRead } from './message-service';
import { messageTypeLabels, type MobileMessageType } from './types';

export function MessageDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { messageType, id } = useLocalSearchParams<{ messageType?: string; id?: string }>();
  const parsedType = parseMessageType(messageType);
  const parsedId = Array.isArray(id) ? id[0] : id;

  const detailQuery = useQuery({
    queryKey: ['mobile', 'message-detail', parsedType, parsedId],
    queryFn: () => fetchMessageDetail(parsedType!, parsedId!),
    enabled: !!parsedType && !!parsedId,
  });

  const readMutation = useMutation({
    mutationFn: () => markMessagesRead({ notificationIds: [parsedId!] }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mobile', 'messages'] });
      void queryClient.invalidateQueries({ queryKey: ['mobile', 'dashboard-home'] });
    },
  });

  useEffect(() => {
    if (detailQuery.data?.unread && parsedType === 'notification' && parsedId && !readMutation.isPending) {
      readMutation.mutate();
    }
  }, [detailQuery.data?.unread, parsedId, parsedType, readMutation]);

  if (!parsedType || !parsedId) {
    return <DetailState title="消息地址无效" actionLabel="返回" onAction={() => router.back()} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          height: 56 + insets.top,
          paddingTop: insets.top,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: theme.background,
        }}
      >
        <TouchableOpacity
          style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', flex: 1 }} numberOfLines={1}>
          消息详情
        </Text>
        <TouchableOpacity
          style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => detailQuery.refetch()}
        >
          <Feather name="refresh-cw" size={17} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {detailQuery.isLoading && <DetailState title="正在加载详情..." loading />}
      {detailQuery.isError && (
        <DetailState
          title="消息不存在或已无权限"
          message={readApiError(detailQuery.error)}
          actionLabel="重试"
          onAction={() => detailQuery.refetch()}
        />
      )}
      {detailQuery.isSuccess && detailQuery.data && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingTop: 12, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: `${readTypeColor(parsedType, theme)}1F`,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: readTypeColor(parsedType, theme), fontSize: 11, fontWeight: '700' }}>
                {messageTypeLabels[detailQuery.data.messageType]}
              </Text>
            </View>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700', lineHeight: 29, marginBottom: 8 }}>
              {detailQuery.data.title}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <MetaItem icon="calendar" text={formatDateTime(detailQuery.data.publishedAt)} />
              <MetaItem icon="user" text={detailQuery.data.messageType === 'notification' ? '系统通知' : '系统管理员'} />
            </View>
          </View>

          <MarkdownBody markdown={detailQuery.data.markdown} />
        </ScrollView>
      )}
    </View>
  );
}

function MarkdownBody({ markdown }: { markdown: string }) {
  const { theme } = useTheme();
  const blocks = markdown.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  if (blocks.length === 0) {
    return (
      <View style={{ paddingVertical: 20 }}>
        <Text style={{ color: theme.textMuted, fontSize: 14 }}>暂无内容</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingVertical: 20 }}>
      {blocks.map((block, index) => renderMarkdownBlock(block, index, theme))}
    </View>
  );
}

function renderMarkdownBlock(block: string, index: number, theme: ReturnType<typeof useTheme>['theme']) {
  if (block.startsWith('```')) {
    const content = block.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    return (
      <View key={index} style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <Text style={{ color: theme.text, fontSize: 13, lineHeight: 20, fontFamily: 'monospace' }}>{content}</Text>
      </View>
    );
  }

  if (block.startsWith('## ')) {
    return (
      <Text key={index} style={{ color: theme.text, fontSize: 18, fontWeight: '700', lineHeight: 25, marginTop: index === 0 ? 0 : 12, marginBottom: 12 }}>
        {block.replace(/^##\s+/, '')}
      </Text>
    );
  }

  if (block.startsWith('### ')) {
    return (
      <Text key={index} style={{ color: theme.text, fontSize: 15, fontWeight: '700', lineHeight: 22, marginTop: 8, marginBottom: 8 }}>
        {block.replace(/^###\s+/, '')}
      </Text>
    );
  }

  if (block.startsWith('>')) {
    return (
      <View key={index} style={{ borderLeftWidth: 3, borderLeftColor: theme.primary, paddingLeft: 14, marginBottom: 12 }}>
        <Text style={{ color: theme.textMuted, fontSize: 14, lineHeight: 24 }}>
          {block.replace(/^>\s?/gm, '')}
        </Text>
      </View>
    );
  }

  if (/^[-*]\s+/m.test(block)) {
    const items = block.split('\n').map((line) => line.replace(/^[-*]\s+/, '').trim()).filter(Boolean);
    return (
      <View key={index} style={{ gap: 6, marginBottom: 12 }}>
        {items.map((item, itemIndex) => (
          <View key={`${index}:${itemIndex}`} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Text style={{ color: theme.primaryLight, fontSize: 14, lineHeight: 22 }}>•</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 22, flex: 1 }}>{stripInlineMarkdown(item)}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <Text key={index} style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 24, marginBottom: 12 }}>
      {stripInlineMarkdown(block)}
    </Text>
  );
}

function MetaItem({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Feather name={icon} size={12} color={theme.textMuted} />
      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

function DetailState({
  title,
  message,
  loading,
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
      {loading ? <ActivityIndicator color={theme.primary} size="large" /> : <Feather name="alert-circle" size={30} color={theme.textMuted} />}
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      {!!message && <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>{message}</Text>}
      {!!actionLabel && !!onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={{ backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 }}
        >
          <Text style={{ color: theme.onPrimary, fontSize: 14, fontWeight: '600' }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function parseMessageType(value: string | string[] | undefined): MobileMessageType | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'announcement' || raw === 'document' || raw === 'release' || raw === 'notification') return raw;
  return null;
}

function readTypeColor(type: MobileMessageType, theme: ReturnType<typeof useTheme>['theme']): string {
  if (type === 'announcement') return theme.warning;
  if (type === 'document') return theme.info;
  if (type === 'release') return theme.primaryLight;
  return theme.primaryLight;
}

function formatDateTime(value: string | null): string {
  if (!value) return '未发布';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stripInlineMarkdown(value: string): string {
  return value.replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

function readApiError(error: unknown): string {
  if (isApiError(error)) return error.message;
  return '请检查登录态和服务器连接后重试';
}

function isApiError(error: unknown): error is ApiErrorResponse {
  return typeof error === 'object' && error !== null && 'message' in error && 'statusCode' in error;
}
