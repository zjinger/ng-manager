export interface DashboardTodoItem {
  kind: "issue_assigned" | "issue_verify" | "rd_assigned" | "rd_review";
  entityId: string;
  code: string;
  title: string;
  status: string;
  updatedAt: string;
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

export interface DashboardStats {
  assignedIssues: number;
  verifyingIssues: number;
  assignedRdItems: number;
  reviewingRdItems: number;
}

export interface DashboardHomeData {
  stats: DashboardStats;
  todos: DashboardTodoItem[];
  announcements: DashboardAnnouncementSummary[];
}
