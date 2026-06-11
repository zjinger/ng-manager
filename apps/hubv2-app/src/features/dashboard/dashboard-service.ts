import { client } from '@/lib/api/client';

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

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const data = await client.get('/dashboard/summary');
    return data as DashboardData;
  } catch {
    // 返回默认数据作为fallback
    return {
      todoStats: {
        pendingIssues: 0,
        pendingVerification: 0,
      },
      rdItems: [],
      announcements: [],
      currentProject: 'ng-manager',
    };
  }
}

export async function fetchTodoStats(): Promise<TodoStats> {
  try {
    const data = await client.get('/dashboard/todo-stats');
    return data as TodoStats;
  } catch {
    return {
      pendingIssues: 0,
      pendingVerification: 0,
    };
  }
}

export async function fetchRDItems(): Promise<RDItem[]> {
  try {
    const data = await client.get('/dashboard/rd-items');
    return data as RDItem[];
  } catch {
    return [];
  }
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  try {
    const data = await client.get('/dashboard/announcements');
    return data as Announcement[];
  } catch {
    return [];
  }
}
