import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import type { AnnouncementQueryContract } from "../announcement/announcement.contract";
import type { ContentLogQueryContract } from "../content-log/content-log.contract";
import type { DocumentQueryContract } from "../document/document.contract";
import type { IssueQueryContract } from "../issue/issue.contract";
import type { ProjectAccessContract } from "../project/project-access.contract";
import type { ProjectQueryContract } from "../project/project.contract";
import type { RdQueryContract } from "../rd/rd.contract";
import type { DashboardQueryContract } from "./dashboard.contract";
import { DashboardRepo } from "./dashboard.repo";
import type {
  DashboardActivityItem,
  DashboardAnnouncementSummary,
  DashboardBoardData,
  DashboardBoardRange,
  DashboardDocumentSummary,
  DashboardHomeData,
  DashboardStats,
  DashboardTodoItem
} from "./dashboard.types";

type DashboardScope = {
  projectIds: string[];
  effectiveProjectIds: string[];
  userId: string | null;
};

export class DashboardService implements DashboardQueryContract {
  constructor(
    private readonly projectAccess: ProjectAccessContract,
    private readonly announcementQuery: AnnouncementQueryContract,
    private readonly documentQuery: DocumentQueryContract,
    private readonly contentLogQuery: ContentLogQueryContract,
    private readonly issueQuery: IssueQueryContract,
    private readonly rdQuery: RdQueryContract,
    private readonly dashboardRepo: DashboardRepo,
    private readonly projectQuery: ProjectQueryContract
  ) {}

  async getHomeData(ctx: RequestContext): Promise<DashboardHomeData> {
    const scope = await this.resolveScope(ctx);
    return {
      stats: await this.getStatsByScope(scope, ctx),
      todos: await this.getTodosByScope(scope, ctx),
      activities: await this.getActivitiesByScope(scope, ctx),
      announcements: await this.getAnnouncementsByScope(scope, ctx),
      documents: await this.getDocumentsByScope(scope, ctx)
    };
  }

  async getStats(ctx: RequestContext): Promise<DashboardStats> {
    const scope = await this.resolveScope(ctx);
    return this.getStatsByScope(scope, ctx);
  }

  async getBoardData(input: { projectId?: string; range: DashboardBoardRange }, ctx: RequestContext): Promise<DashboardBoardData> {
    const scope = await this.resolveBoardScope(input.projectId, ctx);
    return this.dashboardRepo.getBoardData(input.range, scope);
  }

  async getTodos(ctx: RequestContext): Promise<DashboardTodoItem[]> {
    const scope = await this.resolveScope(ctx);
    return this.getTodosByScope(scope, ctx);
  }

  async getActivities(ctx: RequestContext): Promise<DashboardActivityItem[]> {
    const scope = await this.resolveScope(ctx);
    return this.getActivitiesByScope(scope, ctx);
  }

  async getAnnouncements(ctx: RequestContext): Promise<DashboardAnnouncementSummary[]> {
    const scope = await this.resolveScope(ctx);
    return this.getAnnouncementsByScope(scope, ctx);
  }

  async getDocuments(ctx: RequestContext): Promise<DashboardDocumentSummary[]> {
    const scope = await this.resolveScope(ctx);
    return this.getDocumentsByScope(scope, ctx);
  }

  private async resolveScope(ctx: RequestContext): Promise<DashboardScope> {
    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    return {
      projectIds,
      effectiveProjectIds: projectIds,
      userId: ctx.userId ?? null
    };
  }

  private async resolveBoardScope(projectId: string | undefined, ctx: RequestContext): Promise<{
    includeAll: boolean;
    projectIds: string[];
    projectKey: string | null;
  }> {
    const normalizedProjectId = projectId?.trim();
    if (normalizedProjectId) {
      await this.projectAccess.requireProjectAccess(normalizedProjectId, ctx, "view dashboard board");
      const project = await this.projectQuery.getById(normalizedProjectId, ctx).catch(() => null);
      if (!project) {
        throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${normalizedProjectId}`, 404);
      }
      return {
        includeAll: false,
        projectIds: [normalizedProjectId],
        projectKey: project.projectKey
      };
    }

    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    return {
      includeAll: false,
      projectIds,
      projectKey: null
    };
  }

  private async getStatsByScope(scope: DashboardScope, ctx: RequestContext): Promise<DashboardStats> {
    if (!scope.userId) {
      return {
        assignedIssues: 0,
        verifyingIssues: 0,
        reportedUnresolvedIssues: 0,
        assignedRdItems: 0,
        inProgressRdItems: 0,
        myProjects: 0
      };
    }

    const [assignedIssues, verifyingIssues, reportedUnresolvedIssues, assignedRdItems, inProgressRdItems] = await Promise.all([
      this.issueQuery.countAssignedForDashboard(scope.effectiveProjectIds, scope.userId, ctx),
      this.issueQuery.countVerifyingForDashboard(scope.effectiveProjectIds, scope.userId, ctx),
      this.issueQuery.countReportedUnresolvedForDashboard(scope.effectiveProjectIds, scope.userId, ctx),
      this.rdQuery.countAssignedForDashboard(scope.effectiveProjectIds, scope.userId, ctx),
      this.rdQuery.countInProgressForDashboard(scope.effectiveProjectIds, scope.userId, ctx)
    ]);

    return {
      assignedIssues,
      verifyingIssues,
      reportedUnresolvedIssues,
      assignedRdItems,
      inProgressRdItems,
      myProjects: scope.projectIds.length
    };
  }

  private async getTodosByScope(scope: DashboardScope, ctx: RequestContext): Promise<DashboardTodoItem[]> {
    if (!scope.userId) {
      return [];
    }
    const [issueTodos, rdTodos] = await Promise.all([
      this.issueQuery.listTodosForDashboard(scope.effectiveProjectIds, scope.userId, 10, ctx),
      this.rdQuery.listTodosForDashboard(scope.effectiveProjectIds, scope.userId, 10, ctx)
    ]);
    return [...issueTodos, ...rdTodos].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10);
  }

  private async getActivitiesByScope(scope: DashboardScope, ctx: RequestContext): Promise<DashboardActivityItem[]> {
    const recentContentLogs = await this.contentLogQuery.listRecent(scope.effectiveProjectIds, 50);
    if (!scope.userId) {
      return recentContentLogs
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8)
        .map((item) => ({
          kind: "content_activity" as const,
          entityId: item.contentId,
          code: this.contentCode(item.contentType),
          title: item.title,
          action: `${item.contentType}.${item.actionType}`,
          summary: item.summary,
          createdAt: item.createdAt,
          projectId: item.projectId ?? ""
        }));
    }

    const [issueActivities, rdActivities] = await Promise.all([
      this.issueQuery.listActivitiesForDashboard(scope.effectiveProjectIds, scope.userId, 6, ctx),
      this.rdQuery.listActivitiesForDashboard(scope.effectiveProjectIds, scope.userId, 6, ctx)
    ]);
    const contentActivities = recentContentLogs.filter((item) => item.operatorId === scope.userId);

    return [
      ...issueActivities,
      ...rdActivities,
      ...contentActivities.map((item) => ({
        kind: "content_activity" as const,
        entityId: item.contentId,
        code: this.contentCode(item.contentType),
        title: item.title,
        action: `${item.contentType}.${item.actionType}`,
        summary: item.summary,
        createdAt: item.createdAt,
        projectId: item.projectId ?? ""
      }))
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);
  }

  private async getAnnouncementsByScope(scope: DashboardScope, ctx: RequestContext): Promise<DashboardAnnouncementSummary[]> {
    const announcements = await this.announcementQuery.listRecentForDashboard(scope.effectiveProjectIds, 6, ctx);
    return announcements.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      projectId: item.projectId,
      publishAt: item.publishAt,
      pinned: item.pinned
    }));
  }

  private async getDocumentsByScope(scope: DashboardScope, ctx: RequestContext): Promise<DashboardDocumentSummary[]> {
    const documents = await this.documentQuery.listRecentPublishedForNotifications(scope.effectiveProjectIds, 6, ctx);
    return documents.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      projectId: item.projectId,
      publishAt: item.publishAt,
      category: item.category,
      version: item.version,
      slug: item.slug
    }));
  }

  private contentCode(type: string): string {
    if (type === "announcement") return "ANN";
    if (type === "document") return "DOC";
    if (type === "release") return "REL";
    return "CNT";
  }
}
