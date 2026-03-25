export type DashboardTodoItemKind = "issue_assigned" | "issue_verify" | "rd_assigned" | "rd_review";
export type DashboardActivityItemKind = "issue_activity" | "rd_activity";
export interface DashboardStats {
  assignedIssues: number;
  verifyingIssues: number;
  assignedRdItems: number;
  inProgressRdItems: number;
  reviewingRdItems: number;
}
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

export interface DashboardAnnouncement {
  id: string;
  title: string;
  summary: string | null;
  projectId: string | null;
  publishAt: string | null;
  pinned: boolean;
}

export interface DashboardHomeData {
  stats: DashboardStats;
  todos: DashboardTodoItem[];
  activities: DashboardActivityItem[];
  announcements: DashboardAnnouncement[];
}
