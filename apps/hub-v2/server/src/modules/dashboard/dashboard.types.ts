export type DashboardTodoItemKind = "issue_assigned" | "issue_collaborating" | "issue_verify" | "rd_assigned" | "rd_verify";
export type DashboardActivityItemKind = "issue_activity" | "rd_activity" | "content_activity";
export interface DashboardTodoItem {
  kind: DashboardTodoItemKind;
  entityId: string;
  code: string;
  title: string;
  status: string;
  updatedAt: string;
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
