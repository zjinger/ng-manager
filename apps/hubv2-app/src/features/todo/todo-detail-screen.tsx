import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useTheme } from '@/providers/theme-provider';
import { statusBadgeTokens } from '@/lib/theme';
import {
  addIssueComment,
  fetchTodoDetail,
  runTodoAction,
  updateRdProgress,
} from './todo-service';
import type { ApiErrorResponse } from '@/lib/api/client';
import type { MobileTimelineItem, MobileTodoAction, MobileTodoDetail } from './types';
import {
  getTodoActionLabel,
  getTodoPriorityLabel,
  getTodoStatusLabel,
  parseTodoRouteId,
  todoTypeLabels,
} from './types';

export function TodoDetailScreen() {
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const routeTarget = parseTodoRouteId(id);
  const [commentText, setCommentText] = useState('');
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [progressSheetOpen, setProgressSheetOpen] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressNote, setProgressNote] = useState('');

  const detailQuery = useQuery({
    queryKey: ['mobile', 'todo-detail', routeTarget?.targetType, routeTarget?.targetId],
    queryFn: () => fetchTodoDetail(routeTarget!.targetType, routeTarget!.targetId),
    enabled: !!routeTarget,
  });

  const detail = detailQuery.data;
  const comments = useMemo(
    () => detail?.timeline.filter((item) => item.kind === 'comment') ?? [],
    [detail?.timeline]
  );
  const activities = useMemo(
    () => detail?.timeline.filter((item) => item.kind !== 'comment') ?? [],
    [detail?.timeline]
  );

  const commentMutation = useMutation({
    mutationFn: () => addIssueComment(routeTarget!.targetId, commentText.trim()),
    onSuccess: () => {
      setCommentText('');
      invalidateTodos(queryClient, routeTarget);
    },
    onError: (error) => Alert.alert('评论发送失败', readApiError(error)),
  });

  const actionMutation = useMutation({
    mutationFn: (action: MobileTodoAction) => runTodoAction(routeTarget!.targetType, routeTarget!.targetId, action),
    onSuccess: () => {
      setActionSheetOpen(false);
      invalidateTodos(queryClient, routeTarget);
    },
    onError: (error) => Alert.alert('状态更新失败', readApiError(error)),
  });

  const progressMutation = useMutation({
    mutationFn: () => {
      const progress = Number(progressText);
      if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
        throw new Error('进度必须是 0 到 100 之间的数字');
      }
      return updateRdProgress({
        itemId: routeTarget!.targetId,
        progress,
        note: progressNote.trim() || undefined,
      });
    },
    onSuccess: () => {
      setProgressSheetOpen(false);
      setProgressNote('');
      invalidateTodos(queryClient, routeTarget);
    },
    onError: (error) => Alert.alert('进度更新失败', readApiError(error)),
  });

  if (!routeTarget) {
    return <DetailState title="待办地址无效" actionLabel="返回" onAction={() => router.back()} />;
  }

  const handleSendComment = () => {
    if (detail?.targetType !== 'issue') return;
    if (!commentText.trim()) return;
    commentMutation.mutate();
  };

  const openProgressSheet = () => {
    setProgressText(String(detail?.progress ?? 0));
    setProgressNote('');
    setProgressSheetOpen(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          gap: 8,
        }}
      >
        <TouchableOpacity
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: theme.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
          待办详情
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
          title="待办详情加载失败"
          message={readApiError(detailQuery.error)}
          actionLabel="重试"
          onAction={() => detailQuery.refetch()}
        />
      )}
      {detailQuery.isSuccess && detail && (
        <>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + insets.bottom }}
              showsVerticalScrollIndicator={false}
            >
              <DetailHeader detail={detail} mode={mode} />
              <DescriptionBlock description={detail.descriptionMd} />
              {detail.targetType === 'rd' && <ProgressBlock progress={detail.progress} />}
              <TimelineBlock title={`评论 (${comments.length})`} items={comments} emptyText="暂无评论" />
              <TimelineBlock title="活动记录" items={activities} emptyText="暂无活动记录" />
            </ScrollView>

            <BottomActionBar
              detail={detail}
              commentText={commentText}
              isCommentPending={commentMutation.isPending}
              isActionPending={actionMutation.isPending}
              onChangeComment={setCommentText}
              onSendComment={handleSendComment}
              onOpenActionSheet={() => setActionSheetOpen(true)}
              onOpenProgressSheet={openProgressSheet}
            />
          </KeyboardAvoidingView>

          <ActionSheet
            isOpen={actionSheetOpen}
            actions={detail.availableActions}
            isPending={actionMutation.isPending}
            onClose={() => setActionSheetOpen(false)}
            onSelect={(action) => actionMutation.mutate(action)}
          />
          <ProgressSheet
            isOpen={progressSheetOpen}
            progressText={progressText}
            progressNote={progressNote}
            isPending={progressMutation.isPending}
            onChangeProgress={setProgressText}
            onChangeNote={setProgressNote}
            onClose={() => setProgressSheetOpen(false)}
            onSubmit={() => progressMutation.mutate()}
          />
        </>
      )}
    </View>
  );
}

function DetailHeader({ detail, mode }: { detail: MobileTodoDetail; mode: 'dark' | 'light' }) {
  const { theme } = useTheme();
  const statusColor = getStatusColor(detail.status, mode);
  const priorityLabel = getTodoPriorityLabel(detail.priority);

  return (
    <View style={{ paddingTop: 10, paddingBottom: 16, paddingHorizontal: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'monospace' }}>
          {detail.code}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
          {todoTypeLabels[detail.targetType]}
        </Text>
      </View>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', lineHeight: 26, marginBottom: 10 }}>
        {detail.title}
      </Text>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <Badge label={getTodoStatusLabel(detail.status)} color={statusColor.text} bg={statusColor.bg} border={statusColor.border} />
        {!!priorityLabel && <Badge label={priorityLabel} color={theme.warning} bg={`${theme.warning}18`} border={`${theme.warning}33`} />}
        {!!detail.assigneeName && <Badge label={`负责人 ${detail.assigneeName}`} color={theme.textSecondary} bg={theme.surfaceElevated} border={theme.border} />}
        {!!detail.verifierName && <Badge label={`验证人 ${detail.verifierName}`} color={theme.info} bg={`${theme.info}18`} border={`${theme.info}33`} />}
      </View>
    </View>
  );
}

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
      }}
    >
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function DescriptionBlock({ description }: { description: string | null }) {
  const { theme } = useTheme();

  return (
    <View style={{ paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
      <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10 }}>
        描述
      </Text>
      <Text style={{ color: description ? theme.text : theme.textMuted, fontSize: 14, lineHeight: 22 }}>
        {description || '暂无描述'}
      </Text>
    </View>
  );
}

function ProgressBlock({ progress }: { progress: number | null }) {
  const { theme } = useTheme();
  const value = Math.min(Math.max(progress ?? 0, 0), 100);

  return (
    <View style={{ paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>研发进度</Text>
        <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>{value}%</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.surfaceElevated, overflow: 'hidden' }}>
        <View style={{ width: `${value}%`, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
      </View>
    </View>
  );
}

function TimelineBlock({ title, items, emptyText }: { title: string; items: MobileTimelineItem[]; emptyText: string }) {
  const { theme } = useTheme();

  return (
    <View style={{ paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
      <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>
        {title}
      </Text>
      {items.length === 0 && (
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>{emptyText}</Text>
      )}
      <View style={{ gap: 12 }}>
        {items.map((item, index) => (
          <TimelineItem key={item.id} item={item} index={index} />
        ))}
      </View>
    </View>
  );
}

function TimelineItem({ item, index }: { item: MobileTimelineItem; index: number }) {
  const { theme } = useTheme();
  const author = item.authorName || '系统';
  const content = item.content || item.action || '更新了此待办';
  const isComment = item.kind === 'comment';
  const dotColors = [theme.primary, theme.success, theme.warning, theme.info];

  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: isComment ? dotColors[index % dotColors.length] : theme.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: isComment ? 0 : 1,
          borderColor: theme.border,
        }}
      >
        <Text style={{ color: isComment ? theme.onPrimary : theme.textSecondary, fontSize: 13, fontWeight: '700' }}>
          {author[0]}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{author}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 11 }}>{formatDateTime(item.createdAt)}</Text>
        </View>
        <View
          style={{
            backgroundColor: isComment ? theme.surface : 'transparent',
            borderWidth: isComment ? 1 : 0,
            borderColor: theme.border,
            borderRadius: 12,
            padding: isComment ? 12 : 0,
          }}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>
            {content}
          </Text>
        </View>
      </View>
    </View>
  );
}

function BottomActionBar({
  detail,
  commentText,
  isCommentPending,
  isActionPending,
  onChangeComment,
  onSendComment,
  onOpenActionSheet,
  onOpenProgressSheet,
}: {
  detail: MobileTodoDetail;
  commentText: string;
  isCommentPending: boolean;
  isActionPending: boolean;
  onChangeComment: (value: string) => void;
  onSendComment: () => void;
  onOpenActionSheet: () => void;
  onOpenProgressSheet: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const canComment = detail.targetType === 'issue';
  const hasActions = detail.availableActions.length > 0;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10 + insets.bottom,
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        gap: 10,
      }}
    >
      {canComment ? (
        <TextInput
          style={{
            flex: 1,
            minHeight: 40,
            maxHeight: 80,
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 8,
            color: theme.text,
            fontSize: 14,
          }}
          placeholder="添加评论..."
          placeholderTextColor={theme.textMuted}
          value={commentText}
          onChangeText={onChangeComment}
          multiline
        />
      ) : (
        <TouchableOpacity
          style={{
            flex: 1,
            height: 40,
            backgroundColor: theme.surfaceElevated,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onOpenProgressSheet}
        >
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>更新进度</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={{
          height: 40,
          paddingHorizontal: 16,
          backgroundColor: hasActions ? theme.surfaceElevated : theme.background,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hasActions ? 1 : 0.55,
        }}
        disabled={!hasActions || isActionPending}
        onPress={onOpenActionSheet}
      >
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>状态</Text>
      </TouchableOpacity>

      {canComment && (
        <TouchableOpacity
          style={{
            height: 40,
            paddingHorizontal: 16,
            backgroundColor: commentText.trim() ? theme.primary : theme.surfaceElevated,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isCommentPending ? 0.7 : 1,
          }}
          disabled={!commentText.trim() || isCommentPending}
          onPress={onSendComment}
        >
          <Text style={{ color: commentText.trim() ? theme.onPrimary : theme.textMuted, fontSize: 14, fontWeight: '600' }}>
            {isCommentPending ? '发送中' : '发送'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ActionSheet({
  isOpen,
  actions,
  isPending,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  actions: MobileTodoAction[];
  isPending: boolean;
  onClose: () => void;
  onSelect: (action: MobileTodoAction) => void;
}) {
  const { theme } = useTheme();

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} height="42%">
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
        <SheetHeader title="更新状态" onClose={onClose} />
        {actions.length === 0 && (
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>当前没有可执行操作</Text>
        )}
        {actions.map((action) => (
          <TouchableOpacity
            key={action}
            disabled={isPending}
            onPress={() => onSelect(action)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surfaceElevated,
              opacity: isPending ? 0.7 : 1,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>
              {getTodoActionLabel(action)}
            </Text>
            <Feather name="chevron-right" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
}

function ProgressSheet({
  isOpen,
  progressText,
  progressNote,
  isPending,
  onChangeProgress,
  onChangeNote,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  progressText: string;
  progressNote: string;
  isPending: boolean;
  onChangeProgress: (value: string) => void;
  onChangeNote: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { theme } = useTheme();

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} height="48%">
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
        <SheetHeader title="更新研发进度" onClose={onClose} />
        <TextInput
          style={{
            height: 44,
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            color: theme.text,
            fontSize: 15,
          }}
          keyboardType="number-pad"
          placeholder="进度 0-100"
          placeholderTextColor={theme.textMuted}
          value={progressText}
          onChangeText={onChangeProgress}
        />
        <TextInput
          style={{
            minHeight: 84,
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: theme.text,
            fontSize: 14,
            textAlignVertical: 'top',
          }}
          multiline
          placeholder="进度备注"
          placeholderTextColor={theme.textMuted}
          value={progressNote}
          onChangeText={onChangeNote}
        />
        <TouchableOpacity
          disabled={isPending}
          onPress={onSubmit}
          style={{
            height: 44,
            borderRadius: 12,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          <Text style={{ color: theme.onPrimary, fontSize: 15, fontWeight: '700' }}>
            {isPending ? '提交中' : '提交'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{title}</Text>
      <TouchableOpacity
        onPress={onClose}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: theme.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="x" size={16} color={theme.textSecondary} />
      </TouchableOpacity>
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
      {loading ? (
        <ActivityIndicator color={theme.primary} size="large" />
      ) : (
        <Feather name="alert-circle" size={30} color={theme.textMuted} />
      )}
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      {!!message && (
        <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>{message}</Text>
      )}
      {!!actionLabel && !!onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={{
            backgroundColor: theme.primary,
            borderRadius: 12,
            paddingHorizontal: 18,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: theme.onPrimary, fontSize: 14, fontWeight: '600' }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function invalidateTodos(
  queryClient: ReturnType<typeof useQueryClient>,
  target: ReturnType<typeof parseTodoRouteId>
) {
  void queryClient.invalidateQueries({ queryKey: ['mobile', 'todos'] });
  if (target) {
    void queryClient.invalidateQueries({
      queryKey: ['mobile', 'todo-detail', target.targetType, target.targetId],
    });
  }
}

function readApiError(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return '请检查登录态和服务器连接后重试';
}

function isApiError(error: unknown): error is ApiErrorResponse {
  return typeof error === 'object' && error !== null && 'message' in error && 'statusCode' in error;
}
