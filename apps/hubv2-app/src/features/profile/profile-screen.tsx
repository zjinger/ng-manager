import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useTheme } from '@/providers/theme-provider';
import { useAuthStore } from '@/features/auth/use-auth-store';
import type { AdminProfile } from '@/features/auth/types';
import { fetchDashboardHomeData } from '@/features/dashboard/dashboard-service';
import { ProjectSwitchSheet } from '@/features/dashboard/project-switch-sheet';
import { fetchCurrentProfile } from './profile-service';
import { SettingsContent } from './settings-screen';

type FeatherName = keyof typeof Feather.glyphMap;

export function ProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const cachedUser = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const profileQuery = useQuery({
    queryKey: ['mobile', 'profile'],
    queryFn: fetchCurrentProfile,
  });
  const dashboardQuery = useQuery({
    queryKey: ['mobile', 'dashboard-home'],
    queryFn: fetchDashboardHomeData,
  });

  const user = profileQuery.data ?? cachedUser;
  const stats = dashboardQuery.data?.dashboard.stats;
  const bootstrap = dashboardQuery.data?.bootstrap;
  const projects = useMemo(() => bootstrap?.projects ?? [], [bootstrap?.projects]);
  const currentProject =
    projects.find((project) => project.id === selectedProjectId) ?? bootstrap?.currentProject ?? projects[0] ?? null;
  const currentProjectLabel = currentProject?.displayCode || currentProject?.projectKey || undefined;

  const handleLogout = () => {
    Alert.alert('退出登录', '确认退出当前账号？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          signOut();
          queryClient.clear();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          height: 56 + insets.top,
          paddingTop: insets.top,
          paddingHorizontal: 20,
          justifyContent: 'center',
          backgroundColor: theme.background,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>我的</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 88 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <UserCard user={user} loading={profileQuery.isLoading && !user} />

        <Section title="快捷统计">
          <MenuItem
            icon="check-square"
            iconColor={theme.primaryLight}
            iconBg={`${theme.primary}1F`}
            label="我的待办"
            badge={formatCount(stats?.todoTotal)}
            onPress={() => router.push('/(app)/todo')}
          />
          <MenuItem
            icon="message-circle"
            iconColor={theme.success}
            iconBg={`${theme.success}1F`}
            label="我的消息"
            badge={formatCount(stats?.unreadMessages)}
            onPress={() => router.push('/(app)/messages')}
          />
        </Section>

        <Section title="设置">
          <MenuItem
            icon="server"
            iconColor={theme.warning}
            iconBg={`${theme.warning}1F`}
            label="服务器配置"
            onPress={() => setSettingsOpen(true)}
          />
          <MenuItem
            icon="repeat"
            iconColor={theme.info}
            iconBg={`${theme.info}1F`}
            label="项目切换"
            badge={currentProjectLabel}
            onPress={() => setProjectSheetOpen(true)}
          />
          <MenuItem
            icon="info"
            iconColor={theme.textSecondary}
            iconBg={`${theme.textMuted}1F`}
            label="关于"
            badge="v1.0.0"
            onPress={() => setAboutOpen(true)}
          />
        </Section>

        <Section>
          <MenuItem
            icon="log-out"
            iconColor={theme.danger}
            iconBg={`${theme.danger}1F`}
            label="退出登录"
            danger
            showArrow={false}
            onPress={handleLogout}
          />
        </Section>
      </ScrollView>

      <BottomSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} height="78%">
        <View style={{ flex: 1 }}>
          <View
            style={{
              height: 44,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', flex: 1 }}>
              服务器配置
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="关闭服务器配置"
              onPress={() => setSettingsOpen(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: theme.surfaceElevated,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="x" size={17} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <SettingsContent compact />
        </View>
      </BottomSheet>

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

      <AboutSheet isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </View>
  );
}

function UserCard({ user, loading }: { user: AdminProfile | null; loading: boolean }) {
  const { theme } = useTheme();
  const displayName = user?.nickname || user?.username || '未登录用户';
  const roleLabel = user?.systemRoles?.[0]?.name || (user?.role === 'admin' ? 'Admin' : 'User');

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 20,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <Text style={{ color: theme.onPrimary, fontSize: 22, fontWeight: '700' }}>
            {displayName[0].toUpperCase()}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={{ color: theme.primaryLight, fontSize: 13, marginTop: 3 }} numberOfLines={1}>
          {roleLabel}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 3 }} numberOfLines={1}>
          {user?.email || user?.mobile || user?.username || '暂无联系方式'}
        </Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <View style={{ marginBottom: 16 }}>
      {!!title && (
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
      )}
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

function MenuItem({
  icon,
  iconColor,
  iconBg,
  label,
  badge,
  danger,
  showArrow = true,
  onPress,
}: {
  icon: FeatherName;
  iconColor: string;
  iconBg: string;
  label: string;
  badge?: string;
  danger?: boolean;
  showArrow?: boolean;
  onPress?: () => void;
}) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      disabled={!onPress}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name={icon} size={15} color={iconColor} />
      </View>
      <Text style={{ color: danger ? theme.danger : theme.text, fontSize: 14, flex: 1 }}>
        {label}
      </Text>
      {!!badge && (
        <View
          style={{
            backgroundColor: `${theme.primary}1F`,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: theme.primaryLight, fontSize: 12, fontWeight: '600' }}>{badge}</Text>
        </View>
      )}
      {showArrow && <Feather name="chevron-right" size={16} color={theme.textMuted} />}
    </TouchableOpacity>
  );
}

function formatCount(value: number | undefined): string {
  return String(value ?? 0);
}

function AboutSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const appName = Constants.expoConfig?.name ?? 'Hub V2';
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const env = Constants.expoConfig?.extra?.appEnv ?? process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} height="58%">
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: theme.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: theme.onPrimary, fontSize: 22, fontWeight: '800' }}>H</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{appName}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
              研发协作随身端
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="关闭关于"
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: theme.surfaceElevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="x" size={17} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 14,
            }}
          >
            <AboutRow icon="tag" label="版本" value={`v${version}`} />
            <AboutRow icon="activity" label="环境" value={String(env)} />
            <AboutRow icon="hard-drive" label="存储" value="MMKV" />
            <AboutRow icon="cpu" label="架构" value="New Architecture" />
          </View>

          <View
            style={{
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              padding: 16,
              gap: 10,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>移动端边界</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 21 }}>
              使用 Hub V2 Cookie Session 登录态，聚焦工作台、待办、消息和个人协作处理。Personal Token 与 Project Token 不作为生产 App 用户鉴权方式。
            </Text>
          </View>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

function AboutRow({
  icon,
  label,
  value,
}: {
  icon: FeatherName;
  label: string;
  value: string;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <Feather name={icon} size={15} color={theme.textSecondary} />
      <Text style={{ color: theme.textSecondary, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
