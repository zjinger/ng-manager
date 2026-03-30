export type DashboardTodoItemKind = "issue_assigned" | "issue_verify" | "rd_assigned";
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

export interface DashboardStats {
  assignedIssues: number;
  verifyingIssues: number;
  assignedRdItems: number;
  inProgressRdItems: number;
  myProjects: number;
}

export interface DashboardHomeData {
  stats: DashboardStats;
  todos: DashboardTodoItem[];
  activities: DashboardActivityItem[];
  announcements: DashboardAnnouncementSummary[];
  documents: DashboardDocumentSummary[];
}
