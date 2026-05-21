export type DashboardTodoItemKind = "issue_assigned" | "issue_collaborating" | "issue_verify" | "rd_assigned" | "rd_verify";
export type DashboardActivityItemKind = "issue_activity" | "rd_activity" | "content_activity";
export interface DashboardTodoItem {
  kind: DashboardTodoItemKind;
  entityId: string;
  code: string;
  title: string;
  status: string;
  updatedAt: string;
  sortAt?: string;
  projectId: string;
}

export interface DashboardActivityItem {
  kind: DashboardActivityItemKind;
  entityId: string;
  code: string;
  title: string;
  action: string;
  summary: string | null;
  createdAt: string;
  projectId: string;
}

export interface DashboardAnnouncementSummary {
  id: string;
  title: string;
  summary: string | null;
  domain: "content" | "reimbursement";
  projectId: string | null;
  publishAt: string | null;
  pinned: boolean;
}

export interface DashboardDocumentSummary {
  id: string;
  title: string;
  summary: string | null;
  projectId: string | null;
  publishAt: string | null;
  category: string;
  version: string | null;
  slug: string;
}

export interface DashboardReportedIssueItem {
  entityId: string;
  code: string;
  title: string;
  status: string;
  updatedAt: string;
  projectId: string;
  assigneeName: string | null;
}

export interface DashboardStats {
  assignedIssues: number;
  verifyingIssues: number;
  reportedUnresolvedIssues: number;
  assignedRdItems: number;
  inProgressRdItems: number;
  myProjects: number;
}

export interface DashboardHomeData {
  stats: DashboardStats;
  todos: DashboardTodoItem[];
  reportedIssues: DashboardReportedIssueItem[];
  activities: DashboardActivityItem[];
  announcements: DashboardAnnouncementSummary[];
  documents: DashboardDocumentSummary[];
}

export interface DashboardTodoListQuery {
  page?: number;
  pageSize?: number;
  kind?: DashboardTodoItemKind;
  projectId?: string;
}

export interface DashboardTodoListResult {
  items: DashboardTodoItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DashboardReportedIssueListQuery {
  page?: number;
  pageSize?: number;
  projectId?: string;
}

export interface DashboardReportedIssueListResult {
  items: DashboardReportedIssueItem[];
  page: number;
  pageSize: number;
  total: number;
}

export type DashboardBoardRange = "7d" | "30d";

export interface DashboardBoardMetric {
  key: string;
  label: string;
  value: number;
}

export interface DashboardBoardOverview {
  openIssues: number;
  pendingVerifyIssues: number;
  inProgressRdItems: number;
  recentReleaseCount: number;
  unprocessedFeedbackCount: number;
}

export interface DashboardBoardTrend {
  labels: string[];
  issueCreated: number[];
  issueClosed: number[];
  rdCompleted: number[];
}

export interface DashboardBoardDistribution {
  issueByPriority: DashboardBoardMetric[];
  issueByStatus: DashboardBoardMetric[];
  rdByStatus: DashboardBoardMetric[];
  rdByStage: DashboardBoardMetric[];
}

export interface DashboardBoardData {
  range: DashboardBoardRange;
  projectId: string | null;
  overview: DashboardBoardOverview;
  trend: DashboardBoardTrend;
  distribution: DashboardBoardDistribution;
}

export const DASHBOARD_WIDGET_KEYS = [
  "reimbursement.stats",
  "collab.todos",
  "collab.issues",
  "collab.activities",
  "collab.announcements",
  "collab.documents"
] as const;

export const DASHBOARD_SHORTCUT_KEYS = [
  "collab.issueCreate",
  "collab.rdCreate",
  "collab.content",
  "collab.feedbacks",
  "collab.profile",
  "reimbursement.travelExpense",
  "reimbursement.generalExpense",
  "reimbursement.myExpenses",
  "reimbursement.management"
] as const;

export type DashboardWidgetKey = typeof DASHBOARD_WIDGET_KEYS[number];
export type DashboardShortcutKey = typeof DASHBOARD_SHORTCUT_KEYS[number];
export type DashboardWidgetDomain = "reimbursement" | "collab";

export interface WorkspaceCapabilities {
  canAccessReimbursementWorkspace: boolean;
  canAccessCollaborationWorkspace: boolean;
  isReimbursementOnlyUser: boolean;
  isCollaborationOnlyUser: boolean;
  isMixedWorkspaceUser: boolean;
}

export interface DashboardWidgetPreference {
  key: DashboardWidgetKey;
  visible: boolean;
  order: number;
}

export interface DashboardShortcutPreference {
  key: DashboardShortcutKey;
  visible: boolean;
  order: number;
}

export interface DashboardWidgetPreferenceItem extends DashboardWidgetPreference {
  label: string;
  domain: DashboardWidgetDomain;
  defaultVisible: boolean;
  defaultOrder: number;
}

export interface DashboardShortcutPreferenceItem extends DashboardShortcutPreference {
  label: string;
  domain: DashboardWidgetDomain;
  defaultVisible: boolean;
  defaultOrder: number;
}

export interface DashboardPreferences {
  dashboardCode: "home";
  capabilities: WorkspaceCapabilities;
  widgets: DashboardWidgetPreferenceItem[];
  shortcuts: DashboardShortcutPreferenceItem[];
  updatedAt: string | null;
}

export interface UpdateDashboardPreferencesInput {
  widgets: DashboardWidgetPreference[];
  shortcuts?: DashboardShortcutPreference[];
}
