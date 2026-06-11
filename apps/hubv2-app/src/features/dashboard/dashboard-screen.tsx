import React, { useEffect, useMemo, useState } from 'react';
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
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Progress } from '@/components/ui/progress';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  fetchDashboardHomeData,
  type MobileProjectSummary,
  type MobileTodoItem,
} from './dashboard-service';
import type { ApiErrorResponse } from '@/lib/api/client';
import { encodeTodoRouteId } from '@/features/todo/types';

type FeatherName = keyof typeof Feather.glyphMap;

type QuickActionViewModel = {
  key: string;
  title: string;
  icon: FeatherName;
  color: string;
  badgeCount?: number;
  routeKey: 'todo' | 'messages' | 'profile';
};

export function DashboardScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const dashboardQuery = useQuery({
    queryKey: ['mobile', 'dashboard-home'],
    queryFn: fetchDashboardHomeData,
  });

  const bootstrap = dashboardQuery.data?.bootstrap;
  const dashboard = dashboardQuery.data?.dashboard;
  const stats = dashboard?.stats;
  const rdItems = dashboard?.rdProgress ?? [];
  const announcements = dashboard?.announcements ?? [];
  const projects = useMemo(() => bootstrap?.projects ?? [], [bootstrap?.projects]);
  const currentProject =
    projects.find((project) => project.id === selectedProjectId) ?? bootstrap?.currentProject ?? projects[0] ?? null;
  const projectLabel = currentProject?.displayCode || currentProject?.name || '暂无项目';
  const quickActions = buildQuickActions(dashboard?.quickActions ?? [], theme);

  useEffect(() => {
    if (!selectedProjectId && bootstrap?.currentProject) {
      setSelectedProjectId(bootstrap.currentProject.id);
    }
  }, [bootstrap?.currentProject, selectedProjectId]);

  const handleQuickAction = (routeKey: QuickActionViewModel['routeKey']) => {
    if (routeKey === 'todo') {
      router.push('/(app)/todo');
      return;
    }
    if (routeKey === 'messages') {
      router.push('/(app)/messages');
      return;
    }
    router.push('/(app)/profile');
  };

  const renderLoading = () => (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
      <ActivityIndicator color={theme.primary} size="large" />
      <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 12 }}>加载工作台...</Text>
    </View>
  );

  const renderError = () => {
    const error = dashboardQuery.error;
    const message = isApiError(error) ? error.message : '工作台数据加载失败';

    return (
      <View
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          padding: 20,
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Feather name="alert-circle" size={28} color={theme.danger} />
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>无法加载工作台</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>
          {message}
        </Text>
        <TouchableOpacity
          onPress={() => dashboardQuery.refetch()}
          style={{
            backgroundColor: theme.primary,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: theme.onPrimary, fontSize: 14, fontWeight: '600' }}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 12,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
          {t('tabs.home')}
        </Text>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: theme.surfaceElevated,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={() => setProjectSheetOpen(true)}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.success }} />
          <Text style={{ color: theme.textSecondary, fontSize: 12 }} numberOfLines={1}>
            {projectLabel}
          </Text>
          <Feather name="chevron-down" size={13} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={dashboardQuery.isRefetching}
            tintColor={theme.primary}
            colors={[theme.primary]}
            onRefresh={() => dashboardQuery.refetch()}
          />
        }
      >
        {dashboardQuery.isLoading && renderLoading()}
        {dashboardQuery.isError && renderError()}
        {dashboardQuery.isSuccess && (
          <>
        {/* 我的待办 */}
        <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          我的待办
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {/* 待处理 Issue */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: theme.primary + '15',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Feather name="file-text" size={15} color={theme.primaryLight} />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>统一待办</Text>
            <Text style={{ color: theme.text, fontSize: 28, fontWeight: '700', marginTop: 4 }}>
              {stats?.todoTotal ?? 0}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
              Issue {stats?.assignedIssues ?? 0} / RD {stats?.assignedRdItems ?? 0}
            </Text>
          </View>

          {/* 待我验证 */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: theme.success + '15',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Feather name="check-circle" size={15} color={theme.success} />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>待我验证</Text>
            <Text style={{ color: theme.text, fontSize: 28, fontWeight: '700', marginTop: 4 }}>
              {stats?.verifyTotal ?? 0}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
              未读消息 {stats?.unreadMessages ?? 0}
            </Text>
          </View>
        </View>

        {/* 我的研发项 */}
        <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          我的研发项
        </Text>
        <View style={{ gap: 8, marginBottom: 20 }}>
          {rdItems.length === 0 && (
            <InlineEmpty title="暂无研发项进度" icon="clipboard" />
          )}
          {rdItems.map((item) => {
            const progress = readProgress(item);

            return (
            <TouchableOpacity
              key={item.id}
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 16,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
              onPress={() => router.push(`/(app)/todo/${encodeURIComponent(encodeTodoRouteId(item))}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {item.code} · {item.status}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ color: theme.primaryLight, fontSize: 14, fontWeight: '600' }}>
                  {progress === null ? item.status : `${progress}%`}
                </Text>
                {progress !== null && <Progress value={progress} size="sm" style={{ width: 56 }} />}
              </View>
            </TouchableOpacity>
            );
          })}
        </View>

        {/* 最新公告 */}
        <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          最新公告
        </Text>
        <View style={{ gap: 8, marginBottom: 20 }}>
          {announcements.length === 0 && (
            <InlineEmpty title="暂无最新公告" icon="bell-off" />
          )}
          {announcements.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 16,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
              onPress={() => router.push('/(app)/messages')}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: theme.warning + '12',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="bell" size={16} color={theme.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>
                  {item.title}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {formatTime(item.time)}
                </Text>
              </View>
              <Feather name="chevron-right" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* 快捷入口 */}
        <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          快捷入口
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={{
                flex: 1,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 16,
                padding: 16,
                alignItems: 'center',
                gap: 8,
              }}
              onPress={() => handleQuickAction(action.routeKey)}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: action.color + '12',
                  alignItems: 'center',
                justifyContent: 'center',
                }}
              >
                <Feather name={action.icon} size={16} color={action.color} />
              </View>
              {!!action.badgeCount && (
                <Text style={{ color: action.color, fontSize: 11, fontWeight: '600' }}>
                  {action.badgeCount}
                </Text>
              )}
              <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center' }}>
                {action.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
          </>
        )}
      </ScrollView>
      <ProjectSwitchSheet
        isOpen={projectSheetOpen}
        projects={projects}
        selectedProjectId={currentProject?.id ?? null}
        onClose={() => setProjectSheetOpen(false)}
        onSelect={(projectId) => {
          setSelectedProjectId(projectId);
          setProjectSheetOpen(false);
        }}
      />
    </View>
  );
}

function buildQuickActions(
  actions: Array<{ key: string; label: string; badgeCount?: number }>,
  theme: ReturnType<typeof useTheme>['theme']
): QuickActionViewModel[] {
  const fallback: QuickActionViewModel[] = [
    { key: 'todos', title: '我的待办', icon: 'check-square', color: theme.primary, routeKey: 'todo' },
    { key: 'messages', title: '消息中心', icon: 'message-circle', color: theme.info, routeKey: 'messages' },
    { key: 'profile', title: '我的', icon: 'user', color: theme.success, routeKey: 'profile' },
  ];

  if (actions.length === 0) return fallback;

  return actions.slice(0, 3).map((action) => {
    const preset = fallback.find((item) => item.key === action.key);
    return {
      key: action.key,
      title: action.label,
      icon: preset?.icon ?? 'grid',
      color: preset?.color ?? theme.primary,
      badgeCount: action.badgeCount,
      routeKey: preset?.routeKey ?? 'todo',
    };
  });
}

function readProgress(item: MobileTodoItem): number | null {
  const match = item.summary?.match(/(\d{1,3})\s*%/);
  if (!match) return null;
  return Math.min(Math.max(Number(match[1]), 0), 100);
}

function formatTime(value: string): string {
  if (!value) return '未发布';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isApiError(error: unknown): error is ApiErrorResponse {
  return typeof error === 'object' && error !== null && 'message' in error && 'statusCode' in error;
}

function ProjectSwitchSheet({
  isOpen,
  projects,
  selectedProjectId,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  projects: MobileProjectSummary[];
  selectedProjectId: string | null;
  onClose: () => void;
  onSelect: (projectId: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} height="48%">
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>切换项目</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
              选择本次工作台关注的项目
            </Text>
          </View>
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

        <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 8 }}>
            {projects.length === 0 && (
              <InlineEmpty title="暂无可访问项目" icon="folder" />
            )}
            {projects.map((project) => {
              const selected = project.id === selectedProjectId;
              const code = project.displayCode || project.projectKey.slice(0, 2).toUpperCase();

              return (
                <TouchableOpacity
                  key={project.id}
                  onPress={() => onSelect(project.id)}
                  activeOpacity={0.82}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected ? theme.primary + '10' : theme.surface,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: selected ? theme.primary : theme.surfaceElevated,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? theme.onPrimary : theme.textSecondary,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                      numberOfLines={1}
                    >
                      {code}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                      {project.name}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {project.projectKey}
                    </Text>
                  </View>
                  {selected && <Feather name="check-circle" size={18} color={theme.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

function InlineEmpty({ title, icon }: { title: string; icon: FeatherName }) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Feather name={icon} size={22} color={theme.textMuted} />
      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{title}</Text>
    </View>
  );
}
