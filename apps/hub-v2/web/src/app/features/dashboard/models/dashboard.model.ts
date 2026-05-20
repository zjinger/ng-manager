import type { ReimbursementClaimType } from '../../reimbursement/models/reimbursement.model';

export type DashboardTodoItemKind = "issue_assigned" | "issue_collaborating" | "issue_verify" | "rd_assigned" | "rd_verify" | "reimbursement_todo";
export type DashboardActivityItemKind = "issue_activity" | "rd_activity" | "content_activity" | "reimbursement_activity";
export interface DashboardStats {
  assignedIssues: number;
  verifyingIssues: number;
  reportedUnresolvedIssues: number;
  assignedRdItems: number;
  inProgressRdItems: number;
  myProjects: number;
}
export interface DashboardTodoItem {
  kind: DashboardTodoItemKind;
  entityId: string;
  code: string;
  title: string;
  status: string;
  updatedAt: string;
  sortAt?: string;
  projectId: string;
  claimType?: ReimbursementClaimType;
  applicantName?: string;
  amount?: number;
  stageName?: string | null;
}

export interface DashboardTodoPageQuery {
  page?: number;
  pageSize?: number;
  kind?: DashboardTodoItemKind;
  projectId?: string;
}

export interface DashboardTodoPageResult {
  items: DashboardTodoItem[];
  page: number;
  pageSize: number;
  total: number;
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

export interface DashboardReportedIssuePageQuery {
  page?: number;
  pageSize?: number;
  projectId?: string;
}

export interface DashboardReportedIssuePageResult {
  items: DashboardReportedIssueItem[];
  page: number;
  pageSize: number;
  total: number;
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
  claimType?: ReimbursementClaimType;
  amount?: number;
  status?: string;
}

export interface DashboardAnnouncement {
  id: string;
  title: string;
  summary: string | null;
  domain: 'content' | 'reimbursement';
  projectId: string | null;
  publishAt: string | null;
  pinned: boolean;
}

export interface DashboardDocument {
  id: string;
  title: string;
  summary: string | null;
  projectId: string | null;
  publishAt: string | null;
  category: string;
  version: string | null;
  slug: string;
}

export interface DashboardHomeData {
  stats: DashboardStats;
  todos: DashboardTodoItem[];
  reportedIssues: DashboardReportedIssueItem[];
  activities: DashboardActivityItem[];
  announcements: DashboardAnnouncement[];
  documents: DashboardDocument[];
}

export type DashboardBoardRange = '7d' | '30d';

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

export type DashboardWidgetKey =
  | 'reimbursement.stats'
  | 'collab.todos'
  | 'collab.issues'
  | 'collab.activities'
  | 'collab.announcements'
  | 'collab.documents';

export type DashboardWidgetDomain = 'reimbursement' | 'collab';

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

export interface DashboardWidgetPreferenceItem extends DashboardWidgetPreference {
  label: string;
  domain: DashboardWidgetDomain;
  defaultVisible: boolean;
  defaultOrder: number;
}

export interface DashboardPreferences {
  dashboardCode: 'home';
  capabilities: WorkspaceCapabilities;
  widgets: DashboardWidgetPreferenceItem[];
  updatedAt: string | null;
}

export interface UnifiedDashboardViewModel {
  preferences: DashboardPreferences;
  collab: DashboardHomeData | null;
}
