import type { RequestContext } from "../../shared/context/request-context";
import type {
  DashboardActivityItem,
  DashboardAnnouncementSummary,
  DashboardBoardData,
  DashboardBoardRange,
  DashboardDocumentSummary,
  DashboardPreferences,
  DashboardHomeData,
  DashboardReportedIssueItem,
  DashboardReportedIssueListQuery,
  DashboardReportedIssueListResult,
  DashboardStats,
  DashboardTodoItem,
  DashboardTodoListQuery,
  DashboardTodoListResult,
  UpdateDashboardPreferencesInput
} from "./dashboard.types";

export interface DashboardQueryContract {
  getHomeData(ctx: RequestContext): Promise<DashboardHomeData>;
  getBoardData(input: { projectId?: string; range: DashboardBoardRange }, ctx: RequestContext): Promise<DashboardBoardData>;
  getStats(ctx: RequestContext): Promise<DashboardStats>;
  getTodos(ctx: RequestContext): Promise<DashboardTodoItem[]>;
  getTodosPage(query: DashboardTodoListQuery, ctx: RequestContext): Promise<DashboardTodoListResult>;
  getReportedIssues(ctx: RequestContext): Promise<DashboardReportedIssueItem[]>;
  getReportedIssuesPage(query: DashboardReportedIssueListQuery, ctx: RequestContext): Promise<DashboardReportedIssueListResult>;
  getActivities(ctx: RequestContext): Promise<DashboardActivityItem[]>;
  getAnnouncements(ctx: RequestContext): Promise<DashboardAnnouncementSummary[]>;
  getDocuments(ctx: RequestContext): Promise<DashboardDocumentSummary[]>;
  getPreferences(ctx: RequestContext): Promise<DashboardPreferences>;
  updatePreferences(input: UpdateDashboardPreferencesInput, ctx: RequestContext): Promise<DashboardPreferences>;
}
