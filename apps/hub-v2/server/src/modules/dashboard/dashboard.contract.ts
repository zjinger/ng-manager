import type { RequestContext } from "../../shared/context/request-context";
import type {
  DashboardActivityItem,
  DashboardAnnouncementSummary,
  DashboardBoardData,
  DashboardBoardRange,
  DashboardDocumentSummary,
  DashboardHomeData,
  DashboardReportedIssueItem,
  DashboardStats,
  DashboardTodoItem,
  DashboardTodoListQuery,
  DashboardTodoListResult
} from "./dashboard.types";

export interface DashboardQueryContract {
  getHomeData(ctx: RequestContext): Promise<DashboardHomeData>;
  getBoardData(input: { projectId?: string; range: DashboardBoardRange }, ctx: RequestContext): Promise<DashboardBoardData>;
  getStats(ctx: RequestContext): Promise<DashboardStats>;
  getTodos(ctx: RequestContext): Promise<DashboardTodoItem[]>;
  getTodosPage(query: DashboardTodoListQuery, ctx: RequestContext): Promise<DashboardTodoListResult>;
  getReportedIssues(ctx: RequestContext): Promise<DashboardReportedIssueItem[]>;
  getActivities(ctx: RequestContext): Promise<DashboardActivityItem[]>;
  getAnnouncements(ctx: RequestContext): Promise<DashboardAnnouncementSummary[]>;
  getDocuments(ctx: RequestContext): Promise<DashboardDocumentSummary[]>;
}
