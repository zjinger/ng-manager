export type DashboardTone = 'blue' | 'violet' | 'green' | 'amber' | 'rose' | 'slate';

export type DashboardQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface DashboardHeroData {
  displayName: string;
  roleLabel: string;
  summary: string;
  lastLoginAt?: string | null;
}

export interface DashboardStatCardData {
  key: string;
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone: DashboardTone;
  route?: string;
  queryParams?: DashboardQueryParams;
}

export interface DashboardPendingItem {
  id: string;
  title: string;
  typeLabel: string;
  projectName: string;
  statusLabel: string;
  statusColor: string;
  priorityLabel: string;
  priorityColor: string;
  updatedAt: string;
  route?: string;
  queryParams?: DashboardQueryParams;
}

export interface DashboardActivityItem {
  id: string;
  title: string;
  detail: string;
  occurredAt: string;
  icon: string;
  tone: DashboardTone;
  route?: string;
  queryParams?: DashboardQueryParams;
}

export interface DashboardAnnouncementItem {
  id: string;
  title: string;
  summary: string;
  publishAt: string;
  badgeText: string;
  route?: string;
  queryParams?: DashboardQueryParams;
}

export interface DashboardDocumentItem {
  id: string;
  title: string;
  summary: string;
  projectName: string;
  categoryLabel: string;
  updatedAt: string;
  route?: string;
  queryParams?: DashboardQueryParams;
}

export interface DashboardShortcutItem {
  key: string;
  label: string;
  description: string;
  icon: string;
  tone: DashboardTone;
  route: string;
  queryParams?: DashboardQueryParams;
}

export interface DashboardViewData {
  hero: DashboardHeroData;
  stats: DashboardStatCardData[];
  pendingItems: DashboardPendingItem[];
  activityItems: DashboardActivityItem[];
  announcementItems: DashboardAnnouncementItem[];
  documentItems: DashboardDocumentItem[];
}
