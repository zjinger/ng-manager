import { client } from '@/lib/api/client';

export interface MobileProjectSummary {
  id: string;
  projectKey: string;
  name: string;
  displayCode: string | null;
  avatarUrl: string | null;
}

export interface MobileBootstrap {
  profile: {
    id: string;
    userId: string;
    username: string;
    nickname?: string | null;
    role?: string | null;
  };
  projects: MobileProjectSummary[];
  currentProject: MobileProjectSummary | null;
  unreadCount: number;
  capabilities: {
    canUseIssue: boolean;
    canUseRd: boolean;
    canUseMessages: boolean;
    canUseDocuments: boolean;
  };
  defaultFilters: {
    todoCategories: Array<'all' | 'issue' | 'rd' | 'verify'>;
    messageCategories: Array<'all' | 'issue' | 'rd' | 'announcement' | 'document' | 'release'>;
  };
}

export interface MobileDashboardStats {
  todoTotal: number;
  verifyTotal: number;
  assignedIssues: number;
  assignedRdItems: number;
  inProgressRdItems: number;
  unreadMessages: number;
}

export interface MobileTodoItem {
  id: string;
  targetType: 'issue' | 'rd';
  targetId: string;
  code: string;
  title: string;
  status: string;
  priority: string | null;
  projectId: string;
  updatedAt: string;
  assigneeName: string | null;
  summary: string | null;
  mobileRoute: string;
}

export interface MobileMessageItem {
  id: string;
  messageType: 'announcement' | 'document' | 'release' | 'notification';
  category: 'all' | 'issue' | 'rd' | 'announcement' | 'document' | 'release';
  title: string;
  description: string | null;
  unread: boolean;
  time: string;
  projectId: string | null;
  mobileRoute: string;
}

export interface MobileQuickAction {
  key: string;
  label: string;
  target: string;
  badgeCount?: number;
}

export interface MobileDashboard {
  stats: MobileDashboardStats;
  todos: MobileTodoItem[];
  rdProgress: MobileTodoItem[];
  announcements: MobileMessageItem[];
  quickActions: MobileQuickAction[];
}

export interface DashboardHomeData {
  bootstrap: MobileBootstrap;
  dashboard: MobileDashboard;
}

export async function fetchMobileBootstrap(): Promise<MobileBootstrap> {
  const data = await client.get('/admin/mobile/bootstrap');
  return data as unknown as MobileBootstrap;
}

export async function fetchDashboardData(): Promise<MobileDashboard> {
  const data = await client.get('/admin/mobile/dashboard');
  return data as unknown as MobileDashboard;
}

export async function fetchDashboardHomeData(): Promise<DashboardHomeData> {
  const [bootstrap, dashboard] = await Promise.all([
    fetchMobileBootstrap(),
    fetchDashboardData(),
  ]);

  return { bootstrap, dashboard };
}

export interface TodoStats {
  pendingIssues: number;
  pendingVerification: number;
}

export interface RDItem {
  id: string;
  title: string;
  code: string;
  status: string;
  progress: number;
}

export interface Announcement {
  id: string;
  title: string;
  time: string;
  type: 'info' | 'update' | 'maintenance';
}

export interface DashboardData {
  todoStats: TodoStats;
  rdItems: RDItem[];
  announcements: Announcement[];
  currentProject: string;
}

export async function fetchTodoStats(): Promise<TodoStats> {
  const data = await fetchDashboardData();
  return {
    pendingIssues: data.stats.todoTotal,
    pendingVerification: data.stats.verifyTotal,
  };
}

export async function fetchRDItems(): Promise<RDItem[]> {
  const data = await fetchDashboardData();
  return data.rdProgress.map((item) => ({
    id: item.targetId,
    title: item.title,
    code: item.code,
    status: item.status,
    progress: readProgress(item.summary),
  }));
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const data = await fetchDashboardData();
  return data.announcements.map((item) => ({
    id: item.id,
    title: item.title,
    time: item.time,
    type: item.category === 'release' ? 'update' : 'info',
  }));
}

function readProgress(summary: string | null): number {
  const match = summary?.match(/(\d{1,3})\s*%/);
  if (!match) return 0;
  return Math.min(Math.max(Number(match[1]), 0), 100);
}
