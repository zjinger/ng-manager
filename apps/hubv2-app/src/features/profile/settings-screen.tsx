import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiBaseUrl, setApiBaseUrl, type ApiErrorResponse } from '@/lib/api/client';
import { useTheme } from '@/providers/theme-provider';
import { fetchConnectionStatus } from './profile-service';
import type { MobileConnectionStatus } from './types';

export function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', flex: 1 }}>设置</Text>
      </View>

      <SettingsContent />
    </View>
  );
}

export function SettingsContent({ compact = false }: { compact?: boolean }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [apiBaseUrl, setApiBaseUrlInput] = useState(() => getApiBaseUrl());
  const connectionQuery = useQuery({
    queryKey: ['mobile', 'connection'],
    queryFn: fetchConnectionStatus,
    enabled: false,
  });
  const testMutation = useMutation({
    mutationFn: async () => {
      setApiBaseUrl(apiBaseUrl);
      return fetchConnectionStatus();
    },
    onSuccess: () => {
      void connectionQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('连接测试失败', readApiError(error));
    },
  });

  const connection = testMutation.data ?? connectionQuery.data;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: compact ? theme.surface : theme.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: compact ? 36 : 88 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      <Section title="服务器配置">
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>
            API Base URL
          </Text>
          <TextInput
            value={apiBaseUrl}
            onChangeText={setApiBaseUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://host:port/api"
            placeholderTextColor={theme.textMuted}
            style={{
              minHeight: 44,
              backgroundColor: theme.background,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              paddingHorizontal: 14,
              color: theme.text,
              fontSize: 14,
            }}
          />
          <TouchableOpacity
            disabled={testMutation.isPending}
            onPress={() => testMutation.mutate()}
            style={{
              height: 44,
              borderRadius: 12,
              backgroundColor: theme.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: testMutation.isPending ? 0.75 : 1,
            }}
          >
            {testMutation.isPending ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Text style={{ color: theme.onPrimary, fontSize: 15, fontWeight: '700' }}>
                保存并测试连接
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Section>

      <Section title="连接状态">
        <ConnectionStatusCard
          connection={connection}
          loading={connectionQuery.isFetching || testMutation.isPending}
          error={connectionQuery.error ?? testMutation.error}
        />
      </Section>

      <Section title="说明">
        <View style={{ padding: 16 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 21 }}>
            移动端使用 Cookie Session 登录态；Project Token 和 Personal Token 不作为生产 App 用户鉴权方式。
          </Text>
        </View>
      </Section>
    </ScrollView>
  );
}

function ConnectionStatusCard({
  connection,
  loading,
  error,
}: {
  connection?: MobileConnectionStatus;
  loading: boolean;
  error: unknown;
}) {
  const { theme } = useTheme();

  if (loading && !connection) {
    return (
      <View style={{ padding: 20, alignItems: 'center', gap: 10 }}>
        <ActivityIndicator color={theme.primary} />
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>正在测试连接...</Text>
      </View>
    );
  }

  if (error && !connection) {
    return (
      <View style={{ padding: 16, gap: 10 }}>
        <StatusRow icon="x-circle" label="连接失败" value={readApiError(error)} color={theme.danger} />
      </View>
    );
  }

  if (!connection) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>尚未测试连接</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <StatusRow
        icon="check-circle"
        label="登录态"
        value={connection.authenticated ? '有效' : '无效'}
        color={connection.authenticated ? theme.success : theme.danger}
      />
      <StatusRow icon="server" label="环境" value={connection.env} color={theme.info} />
      <StatusRow icon="folder" label="可访问项目" value={`${connection.projectCount}`} color={theme.primaryLight} />
      <StatusRow
        icon="git-branch"
        label="当前项目"
        value={connection.currentProject?.name ?? '暂无项目'}
        color={theme.warning}
      />
      <StatusRow
        icon="user"
        label="当前用户"
        value={connection.profile.nickname || connection.profile.username}
        color={theme.textSecondary}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          color: theme.textMuted,
          fontSize: 12,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          paddingHorizontal: 4,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function StatusRow({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: `${color}1F`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={{ color: theme.textSecondary, fontSize: 13, width: 82 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 13, flex: 1 }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function readApiError(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return '服务器不可达，请检查地址和网络';
}

function isApiError(error: unknown): error is ApiErrorResponse {
  return typeof error === 'object' && error !== null && 'message' in error && 'statusCode' in error;
}
