import type { RequestContext } from "../../shared/context/request-context";
import type { AnnouncementQueryContract } from "../announcement/announcement.contract";
import type { ContentLogQueryContract } from "../content-log/content-log.contract";
import type { DocumentQueryContract } from "../document/document.contract";
import type { IssueQueryContract } from "../issue/issue.contract";
import type { ProjectAccessContract } from "../project/project-access.contract";
import type { RdQueryContract } from "../rd/rd.contract";
import type { DashboardQueryContract } from "./dashboard.contract";
import type {
  DashboardActivityItem,
  DashboardAnnouncementSummary,
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
    private readonly rdQuery: RdQueryContract
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
      effectiveProjectIds: ctx.roles.includes("admin") ? [] : projectIds,
      userId: ctx.userId ?? null
    };
  }

  private async getStatsByScope(scope: DashboardScope, ctx: RequestContext): Promise<DashboardStats> {
    if (!scope.userId) {
      return {
        assignedIssues: 0,
        verifyingIssues: 0,
        assignedRdItems: 0,
        inProgressRdItems: 0,
        myProjects: 0
      };
    }

    const [assignedIssues, verifyingIssues, assignedRdItems, inProgressRdItems] = await Promise.all([
      this.issueQuery.countAssignedForDashboard(scope.effectiveProjectIds, scope.userId, ctx),
      this.issueQuery.countVerifyingForDashboard(scope.effectiveProjectIds, scope.userId, ctx),
      this.rdQuery.countAssignedForDashboard(scope.effectiveProjectIds, scope.userId, ctx),
      this.rdQuery.countInProgressForDashboard(scope.effectiveProjectIds, scope.userId, ctx)
    ]);

    return {
      assignedIssues,
      verifyingIssues,
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
    const contentActivities = await this.contentLogQuery.listRecent(scope.effectiveProjectIds, 8);
    if (!scope.userId) {
      return contentActivities
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
