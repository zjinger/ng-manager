import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { normalizePage } from "../../shared/http/pagination";
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
  DashboardReportedIssueItem,
  DashboardStats,
  DashboardTodoItem,
  DashboardTodoListQuery,
  DashboardTodoListResult
} from "./dashboard.types";

type DashboardScope = {
  projectIds: string[];
  effectiveProjectIds: string[];
  userId: string | null;
};

export class DashboardService implements DashboardQueryContract {
  private static readonly ISSUE_CREATE_ACTIVITY_WINDOW_MS = 5 * 60 * 1000;

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
      reportedIssues: await this.getReportedIssuesByScope(scope, ctx),
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

  async getTodosPage(query: DashboardTodoListQuery, ctx: RequestContext): Promise<DashboardTodoListResult> {
    const scope = await this.resolveScope(ctx);
    return this.getTodosPageByScope(scope, query, ctx);
  }

  async getReportedIssues(ctx: RequestContext): Promise<DashboardReportedIssueItem[]> {
    const scope = await this.resolveScope(ctx);
    return this.getReportedIssuesByScope(scope, ctx);
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

    const [assignedIssues, issueVerifyingCount, rdVerifyingCount, reportedUnresolvedIssues, assignedRdItems, inProgressRdItems] = await Promise.all([
      this.issueQuery.countAssignedForDashboard(scope.effectiveProjectIds, scope.userId, ctx),
      this.issueQuery.countVerifyingForDashboard(scope.effectiveProjectIds, scope.userId, ctx),
      this.rdQuery.countReviewingForDashboard(scope.effectiveProjectIds, scope.userId, ctx),
      this.issueQuery.countReportedUnresolvedForDashboard(scope.effectiveProjectIds, scope.userId, ctx),
      this.rdQuery.countAssignedForDashboard(scope.effectiveProjectIds, scope.userId, ctx),
      this.rdQuery.countInProgressForDashboard(scope.effectiveProjectIds, scope.userId, ctx)
    ]);

    return {
      assignedIssues,
      verifyingIssues: issueVerifyingCount + rdVerifyingCount,
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
      this.issueQuery.listTodosForDashboard(scope.effectiveProjectIds, scope.userId, 20, ctx),
      this.rdQuery.listTodosForDashboard(scope.effectiveProjectIds, scope.userId, 10, ctx)
    ]);
    return this.mergeTodos(issueTodos, rdTodos, 10);
  }

  private async getTodosPageByScope(
    scope: DashboardScope,
    query: DashboardTodoListQuery,
    ctx: RequestContext
  ): Promise<DashboardTodoListResult> {
    if (!scope.userId) {
      return { items: [], page: 1, pageSize: 20, total: 0 };
    }

    const [issueTodos, rdTodos] = await Promise.all([
      this.issueQuery.listTodosForDashboard(scope.effectiveProjectIds, scope.userId, 0, ctx),
      this.rdQuery.listTodosForDashboard(scope.effectiveProjectIds, scope.userId, 0, ctx)
    ]);
    const merged = this.mergeTodos(issueTodos, rdTodos);
    const filtered = merged.filter((item) => {
      if (query.kind && item.kind !== query.kind) {
        return false;
      }
      if (query.projectId?.trim() && item.projectId !== query.projectId.trim()) {
        return false;
      }
      return true;
    });
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);

    return {
      items: filtered.slice(offset, offset + pageSize),
      page,
      pageSize,
      total: filtered.length
    };
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
      this.issueQuery.listActivitiesForDashboard(scope.effectiveProjectIds, scope.userId, 20, ctx),
      this.rdQuery.listActivitiesForDashboard(scope.effectiveProjectIds, scope.userId, 6, ctx)
    ]);
    const contentActivities = recentContentLogs.filter((item) => item.operatorId === scope.userId);
    const collapsedIssueActivities = this.collapseIssueCreateActivities(issueActivities);

    return [
      ...collapsedIssueActivities,
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

  private async getReportedIssuesByScope(scope: DashboardScope, ctx: RequestContext): Promise<DashboardReportedIssueItem[]> {
    if (!scope.userId) {
      return [];
    }
    const result = await this.issueQuery.list(
      {
        page: 1,
        pageSize: 8,
        reporterIds: [scope.userId],
        assigneeIds: [],
        status: ["open", "in_progress", "pending_update", "reopened"],
        types: [],
        priority: [],
        moduleCodes: [],
        versionCodes: [],
        environmentCodes: [],
        includeAssigneeParticipants: true,
        sortBy: "updatedAt",
        sortOrder: "desc"
      },
      ctx
    );
    return result.items.map((item) => ({
      entityId: item.id,
      code: item.issueNo,
      title: item.title,
      status: item.status,
      updatedAt: item.updatedAt,
      projectId: item.projectId,
      assigneeName: item.assigneeName
    }));
  }

  private collapseIssueCreateActivities(items: DashboardActivityItem[]): DashboardActivityItem[] {
    const issueItems = items.filter((item) => item.kind === "issue_activity");
    if (issueItems.length <= 1) {
      return items;
    }

    const bundles = new Map<string, DashboardActivityItem[]>();
    for (const item of issueItems) {
      const list = bundles.get(item.entityId) ?? [];
      list.push(item);
      bundles.set(item.entityId, list);
    }

    const replacementByKey = new Map<string, DashboardActivityItem>();
    const consumedKeys = new Set<string>();

    for (const bundle of bundles.values()) {
      const createItem = bundle.find((item) => item.action === "create" && item.summary?.startsWith("创建问题 "));
      if (!createItem) {
        continue;
      }

      const createAt = Date.parse(createItem.createdAt);
      if (!Number.isFinite(createAt)) {
        continue;
      }

      const related = bundle.filter((item) => this.shouldCollapseWithCreate(item, createAt));
      if (related.length <= 1) {
        continue;
      }

      const assigneeNames = Array.from(
        new Set(
          related
            .map((item) => this.extractAssignedName(item.summary))
            .filter((value): value is string => Boolean(value))
        )
      );
      const collaboratorNames = Array.from(
        new Set(
          related.flatMap((item) => this.extractCollaboratorNames(item.summary))
        )
      );

      const fragments = [`创建问题 ${createItem.code}`];
      if (assigneeNames.length > 0) {
        fragments.push(`指派负责人 ${assigneeNames.join("、")}`);
      }
      if (collaboratorNames.length > 0) {
        fragments.push(`添加协作人 ${collaboratorNames.join("、")}`);
      }

      const latest = related.reduce((current, item) => (item.createdAt > current.createdAt ? item : current), createItem);
      const replacement: DashboardActivityItem = {
        ...latest,
        action: "create",
        summary: fragments.join("；")
      };

      for (const item of related) {
        consumedKeys.add(this.activityKey(item));
      }
      replacementByKey.set(this.activityKey(createItem), replacement);
    }

    const result: DashboardActivityItem[] = [];
    for (const item of items) {
      const key = this.activityKey(item);
      if (!consumedKeys.has(key)) {
        result.push(item);
        continue;
      }
      const replacement = replacementByKey.get(key);
      if (replacement) {
        result.push(replacement);
      }
    }
    return result;
  }

  private shouldCollapseWithCreate(item: DashboardActivityItem, createAt: number): boolean {
    if (item.kind !== "issue_activity") {
      return false;
    }

    const itemAt = Date.parse(item.createdAt);
    if (!Number.isFinite(itemAt)) {
      return false;
    }
    if (itemAt < createAt || itemAt - createAt > DashboardService.ISSUE_CREATE_ACTIVITY_WINDOW_MS) {
      return false;
    }

    if (item.action === "create" && item.summary?.startsWith("创建问题 ")) {
      return true;
    }
    if (item.action === "assign" && !!this.extractAssignedName(item.summary)) {
      return true;
    }
    if (item.action === "update" && this.extractCollaboratorNames(item.summary).length > 0) {
      return true;
    }
    return false;
  }

  private extractAssignedName(summary: string | null): string | null {
    const text = summary?.trim();
    if (!text) {
      return null;
    }
    const matched = text.match(/^(?:创建时指派负责人[:：]|指派给)\s*(.+)$/);
    return matched?.[1]?.trim() || null;
  }

  private extractCollaboratorNames(summary: string | null): string[] {
    const text = summary?.trim();
    if (!text || !text.startsWith("添加协作人 ")) {
      return [];
    }
    return text
      .slice("添加协作人 ".length)
      .split("、")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private activityKey(item: DashboardActivityItem): string {
    return `${item.kind}::${item.entityId}::${item.createdAt}::${item.action}::${item.summary ?? ""}`;
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

  private mergeTodos(issueTodos: DashboardTodoItem[], rdTodos: DashboardTodoItem[], limit?: number): DashboardTodoItem[] {
    if (limit === undefined) {
      return [...issueTodos, ...rdTodos].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }

    const merged = [...issueTodos, ...rdTodos]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);

    const activeRdTodo = rdTodos.find((item) => item.status === "doing" || item.status === "blocked");
    if (!activeRdTodo) {
      return merged;
    }

    const alreadyIncluded = merged.some((item) => item.entityId === activeRdTodo.entityId);
    if (alreadyIncluded) {
      return merged;
    }

    const replacementIndex = merged.length < limit
      ? -1
      : merged
          .map((item, index) => ({ item, index }))
          .reverse()
          .find(({ item }) => !item.kind.startsWith("rd"))?.index ?? -1;

    const next = [...merged];
    if (replacementIndex >= 0) {
      next.splice(replacementIndex, 1, activeRdTodo);
    } else {
      next.push(activeRdTodo);
    }

    return next
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }
}
