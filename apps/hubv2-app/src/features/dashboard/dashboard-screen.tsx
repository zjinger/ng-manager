import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useTheme } from '@/providers/theme-provider';
import { Progress } from '@/components/ui/progress';
import { Feather } from '@expo/vector-icons';

export function DashboardScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  // Mock data - 实际应从API获取
  const todoStats = {
    pendingIssues: 12,
    pendingVerification: 4,
  };

  const rdItems = [
    { id: '1', title: '用户权限重构', code: 'RDI-021', status: '进行中', progress: 60 },
    { id: '2', title: 'WebSocket 重连机制', code: 'RDI-018', status: '进行中', progress: 75 },
  ];

  const announcements = [
    { id: '1', title: 'v2.3 发布通知', time: '2小时前', type: 'info' as const },
    { id: '2', title: '服务器维护公告', time: '昨天', type: 'maintenance' as const },
  ];

  const quickActions = [
    { id: '1', title: '我的待办', icon: 'check-square', color: theme.primary, route: '/(app)/todo' },
    { id: '2', title: '消息中心', icon: 'message-circle', color: theme.info, route: '/(app)/messages' },
    { id: '3', title: '项目切换', icon: 'repeat', color: theme.success, route: '/(app)/profile' },
  ];

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
          onPress={() => {/* 切换项目 */}}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.success }} />
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>ng-manager</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
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
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>待处理 Issue</Text>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 }}>
              {todoStats.pendingIssues}
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
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 }}>
              {todoStats.pendingVerification}
            </Text>
          </View>
        </View>

        {/* 我的研发项 */}
        <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          我的研发项
        </Text>
        <View style={{ gap: 8, marginBottom: 20 }}>
          {rdItems.map((item) => (
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
              onPress={() => router.push(`/(app)/todo/${item.id}`)}
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
                  {item.progress}%
                </Text>
                <Progress value={item.progress} size="sm" style={{ width: 56 }} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 最新公告 */}
        <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          最新公告
        </Text>
        <View style={{ gap: 8, marginBottom: 20 }}>
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
              onPress={() => router.push(`/(app)/messages/${item.id}`)}
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
                  {item.time}
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
              key={action.id}
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
              onPress={() => router.push(action.route as any)}
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
                <Feather name={action.icon as any} size={16} color={action.color} />
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center' }}>
                {action.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}