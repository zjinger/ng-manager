import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TodoCard } from './todo-card';
import { fetchTodoList } from './todo-service';
import {
  encodeTodoRouteId,
  todoFilterLabels,
  type MobileTodoItem,
  type TodoFilter,
} from './types';
import type { ApiErrorResponse } from '@/lib/api/client';

const filters: TodoFilter[] = ['all', 'issue', 'rd', 'verify'];

export function TodoListScreen() {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<TodoFilter>('all');
  const todoQuery = useQuery({
    queryKey: ['mobile', 'todos', activeFilter],
    queryFn: () => fetchTodoList({ category: activeFilter, page: 1, pageSize: 20 }),
  });

  const items = useMemo(() => todoQuery.data?.items ?? [], [todoQuery.data?.items]);

  const handlePressItem = (item: MobileTodoItem) => {
    router.push(`/(app)/todo/${encodeURIComponent(encodeTodoRouteId(item))}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: insets.top,
          height: 56 + insets.top,
          justifyContent: 'center',
          backgroundColor: theme.background,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
          {t('tabs.todo')}
        </Text>
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
        {filters.map((filter) => {
          const isActive = activeFilter === filter;
          const activeBackground = mode === 'dark' ? `${theme.primary}26` : theme.primary;
          const activeText = mode === 'dark' ? theme.primaryLight : theme.onPrimary;
          const activeBorder = mode === 'dark' ? `${theme.primary}4D` : theme.primary;
          return (
            <TouchableOpacity
              key={filter}
              style={{
                paddingHorizontal: 14,
                height: 30,
                backgroundColor: isActive ? activeBackground : theme.surface,
                borderWidth: 1,
                borderColor: isActive ? activeBorder : theme.border,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={{
                  color: isActive ? activeText : theme.textSecondary,
                  fontSize: 13,
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {todoFilterLabels[filter]}
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
            refreshing={todoQuery.isRefetching}
            tintColor={theme.primary}
            colors={[theme.primary]}
            onRefresh={() => todoQuery.refetch()}
          />
        }
      >
        {todoQuery.isLoading && <CenteredState icon="loader" title="正在加载待办..." />}
        {todoQuery.isError && (
          <ErrorState
            message={readApiError(todoQuery.error)}
            onRetry={() => todoQuery.refetch()}
          />
        )}
        {todoQuery.isSuccess && items.length === 0 && (
          <CenteredState icon="check-circle" title="暂无待办事项" />
        )}
        {todoQuery.isSuccess && items.map((item) => (
          <TodoCard key={item.id} item={item} onPress={handlePressItem} />
        ))}
      </ScrollView>
    </View>
  );
}

function CenteredState({ icon, title }: { icon: keyof typeof Feather.glyphMap; title: string }) {
  const { theme } = useTheme();
  const isLoading = icon === 'loader';

  return (
    <View style={{ flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      {isLoading ? (
        <ActivityIndicator color={theme.primary} size="large" />
      ) : (
        <Feather name={icon} size={28} color={theme.textMuted} />
      )}
      <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{title}</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Feather name="alert-circle" size={30} color={theme.danger} />
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>待办加载失败</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>
        {message}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{
          backgroundColor: theme.primary,
          borderRadius: 12,
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
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
