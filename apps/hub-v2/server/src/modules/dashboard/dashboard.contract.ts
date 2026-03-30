import type { RequestContext } from "../../shared/context/request-context";
import type {
  DashboardActivityItem,
  DashboardAnnouncementSummary,
  DashboardDocumentSummary,
  DashboardHomeData,
  DashboardStats,
  DashboardTodoItem
} from "./dashboard.types";

export interface DashboardQueryContract {
  getHomeData(ctx: RequestContext): Promise<DashboardHomeData>;
  getStats(ctx: RequestContext): Promise<DashboardStats>;
  getTodos(ctx: RequestContext): Promise<DashboardTodoItem[]>;
  getActivities(ctx: RequestContext): Promise<DashboardActivityItem[]>;
  getAnnouncements(ctx: RequestContext): Promise<DashboardAnnouncementSummary[]>;
  getDocuments(ctx: RequestContext): Promise<DashboardDocumentSummary[]>;
}
