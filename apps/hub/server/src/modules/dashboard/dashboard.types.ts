export type DashboardTone = "blue" | "violet" | "green" | "amber" | "rose" | "slate";

export const DASHBOARD_STAT_CARD_KEYS = [
  "pending",
  "verify",
  "rd-doing",
  "reported-issues",
  "reported-active",
  "rd-blocked",
  "rd-review",
  "announcements",
  "docs",
  "projects"
] as const;

export type DashboardStatCardKey = typeof DASHBOARD_STAT_CARD_KEYS[number];
export type DashboardIssuePriorityScope = "all" | "high_up" | "critical"; // 统计范围：所有优先级 / 高及以上优先级 / 紧急优先级
export type DashboardQueryParams = Record<string, string | number | boolean | null | undefined>;

export interface DashboardProjectOption {
  id: string;
  name: string;
}

export interface DashboardHeroData {
  displayName: string;
  roleLabel: string;
  summary: string;
  lastLoginAt?: string | null;
}

export interface DashboardStatCardFilters {
  priorityScope?: DashboardIssuePriorityScope;
  projectIds?: string[];
}

export interface DashboardStatCardData {
  key: DashboardStatCardKey;
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone: DashboardTone;
  route?: string;
  queryParams?: DashboardQueryParams;
}

export interface DashboardStatCardPreferenceInput {
  key: DashboardStatCardKey;
  enabled: boolean;
  order: number;
  filters?: DashboardStatCardFilters;
}

export interface DashboardStatCardPreferenceItem extends DashboardStatCardPreferenceInput {
  label: string;
  helper: string;
  icon: string;
  tone: DashboardTone;
  route?: string;
  defaultEnabled: boolean;
  defaultOrder: number;
  supportsPriorityScope: boolean;
  supportsProjectIds: boolean;
}

export interface DashboardStatPreferencesResult {
  cards: DashboardStatCardPreferenceItem[];
  availableProjects: DashboardProjectOption[];
  updatedAt?: string | null;
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

export interface DashboardViewData {
  hero: DashboardHeroData;
  stats: DashboardStatCardData[];
  pendingItems: DashboardPendingItem[];
  activityItems: DashboardActivityItem[];
  announcementItems: DashboardAnnouncementItem[];
  documentItems: DashboardDocumentItem[];
}
