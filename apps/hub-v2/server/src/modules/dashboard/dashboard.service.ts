import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { normalizePage } from "../../shared/http/pagination";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
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
  DashboardPreferences,
  DashboardShortcutKey,
  DashboardShortcutPreference,
  DashboardShortcutPreferenceItem,
  DashboardWidgetKey,
  DashboardWidgetPreference,
  DashboardWidgetPreferenceItem,
  DashboardHomeData,
  DashboardReportedIssueItem,
  DashboardReportedIssueListQuery,
  DashboardReportedIssueListResult,
  DashboardStats,
  DashboardTodoItem,
  DashboardTodoListQuery,
  DashboardTodoListResult,
  DashboardWidgetDomain,
  UpdateDashboardPreferencesInput,
  WorkspaceCapabilities
} from "./dashboard.types";

type DashboardScope = {
  projectIds: string[];
  effectiveProjectIds: string[];
  userId: string | null;
};

type DashboardWidgetDefinition = {
  key: DashboardWidgetKey;
  label: string;
  domain: DashboardWidgetDomain;
  defaultOrder: number;
  defaultVisible: boolean;
};

type DashboardShortcutDefinition = {
  key: DashboardShortcutKey;
  label: string;
  domain: DashboardWidgetDomain;
  defaultOrder: number;
  defaultVisible: boolean;
};

type StoredDashboardLayout = {
  widgets: DashboardWidgetPreference[];
  shortcuts: DashboardShortcutPreference[];
};

const DASHBOARD_CODE = "home";
const REIMBURSEMENT_PERMISSION_CODES = new Set([
  "expense.submit",
  "expense.view.self",
  "expense.report.view",
  "expense.review.manage",
  "expense.rule.manage",
  "finance.review",
  "finance.cashier"
]);
const REIMBURSEMENT_APPROVAL_PERMISSION_CODES = new Set([
  "approval.department",
  "approval.cross_department",
  "finance.review",
  "finance.cashier"
]);
const COLLABORATION_PERMISSION_CODES = new Set([
  "project.manage",
  "project.read.all",
  "project.manage.all",
  "project.archive",
  "project.owner.transfer"
]);

const DASHBOARD_WIDGET_DEFINITIONS: DashboardWidgetDefinition[] = [
  { key: "reimbursement.stats", label: "报销统计", domain: "reimbursement", defaultOrder: 30, defaultVisible: true },
  { key: "collab.todos", label: "我的待办", domain: "collab", defaultOrder: 110, defaultVisible: true },
  { key: "collab.issues", label: "我提的测试单", domain: "collab", defaultOrder: 120, defaultVisible: true },
  { key: "collab.activities", label: "我的动态", domain: "collab", defaultOrder: 130, defaultVisible: true },
  { key: "collab.announcements", label: "最新公告", domain: "collab", defaultOrder: 140, defaultVisible: true },
  { key: "collab.documents", label: "最新文档", domain: "collab", defaultOrder: 150, defaultVisible: true }
];

const DASHBOARD_WIDGET_DEFINITION_MAP = new Map(DASHBOARD_WIDGET_DEFINITIONS.map((definition) => [definition.key, definition]));

const DASHBOARD_SHORTCUT_DEFINITIONS: DashboardShortcutDefinition[] = [
  { key: "collab.issueCreate", label: "新建测试单", domain: "collab", defaultOrder: 10, defaultVisible: true },
  { key: "collab.rdCreate", label: "新建研发项", domain: "collab", defaultOrder: 20, defaultVisible: true },
  { key: "collab.content", label: "内容管理", domain: "collab", defaultOrder: 30, defaultVisible: true },
  { key: "collab.feedbacks", label: "反馈管理", domain: "collab", defaultOrder: 40, defaultVisible: true },
  { key: "collab.profile", label: "个人中心", domain: "collab", defaultOrder: 50, defaultVisible: true },
  { key: "reimbursement.travelExpense", label: "差旅费报销", domain: "reimbursement", defaultOrder: 110, defaultVisible: true },
  { key: "reimbursement.generalExpense", label: "费用报销", domain: "reimbursement", defaultOrder: 120, defaultVisible: true },
  { key: "reimbursement.myExpenses", label: "我的报销", domain: "reimbursement", defaultOrder: 130, defaultVisible: true },
  { key: "reimbursement.management", label: "报销管理", domain: "reimbursement", defaultOrder: 140, defaultVisible: true }
];

const DASHBOARD_SHORTCUT_DEFINITION_MAP = new Map(DASHBOARD_SHORTCUT_DEFINITIONS.map((definition) => [definition.key, definition]));

export class DashboardService implements DashboardQueryContract {
  private static readonly ISSUE_CREATE_ACTIVITY_WINDOW_MS = 5 * 60 * 1000;
  private static readonly ACTIVITY_PREVIEW_LIMIT = 10;

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

  async getReportedIssuesPage(query: DashboardReportedIssueListQuery, ctx: RequestContext): Promise<DashboardReportedIssueListResult> {
    const scope = await this.resolveScope(ctx);
    return this.getReportedIssuesPageByScope(scope, query, ctx);
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

  async getPreferences(ctx: RequestContext): Promise<DashboardPreferences> {
    const { userId, capabilities, availableDefinitions, availableShortcutDefinitions } = await this.resolvePreferenceContext(ctx);
    const record = this.dashboardRepo.findPreference(userId, DASHBOARD_CODE);
    const storedLayout = this.parseStoredLayout(record?.layoutJson);
    const widgets = this.toPreferenceItems(
      this.normalizeWidgetPreferences(storedLayout.widgets, availableDefinitions),
      availableDefinitions
    );
    const shortcuts = this.toShortcutPreferenceItems(
      this.normalizeShortcutPreferences(storedLayout.shortcuts, availableShortcutDefinitions),
      availableShortcutDefinitions
    );

    return {
      dashboardCode: DASHBOARD_CODE,
      capabilities,
      widgets,
      shortcuts,
      updatedAt: record?.updatedAt ?? null
    };
  }

  async updatePreferences(input: UpdateDashboardPreferencesInput, ctx: RequestContext): Promise<DashboardPreferences> {
    const { userId, capabilities, availableDefinitions, availableShortcutDefinitions } = await this.resolvePreferenceContext(ctx);
    const current = this.dashboardRepo.findPreference(userId, DASHBOARD_CODE);
    const currentLayout = this.parseStoredLayout(current?.layoutJson);
    const normalized = this.normalizeWidgetPreferences(input.widgets, availableDefinitions);
    const normalizedShortcuts = this.normalizeShortcutPreferences(
      input.shortcuts ?? currentLayout.shortcuts,
      availableShortcutDefinitions
    );
    if (!normalized.some((item) => item.visible)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "at least one dashboard widget must be visible", 400);
    }

    const now = nowIso();
    this.dashboardRepo.savePreference({
      id: current?.id ?? genId("dpf"),
      userId,
      dashboardCode: DASHBOARD_CODE,
      layoutJson: JSON.stringify({ widgets: normalized, shortcuts: normalizedShortcuts }),
      statsConfigJson: current?.statsConfigJson ?? "{}",
      createdAt: current?.createdAt ?? now,
      updatedAt: now
    });

    return {
      dashboardCode: DASHBOARD_CODE,
      capabilities,
      widgets: this.toPreferenceItems(normalized, availableDefinitions),
      shortcuts: this.toShortcutPreferenceItems(normalizedShortcuts, availableShortcutDefinitions),
      updatedAt: now
    };
  }

  private async resolveScope(ctx: RequestContext): Promise<DashboardScope> {
    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    return {
      projectIds,
      effectiveProjectIds: projectIds,
      userId: ctx.userId ?? null
    };
  }

  private async resolvePreferenceContext(ctx: RequestContext): Promise<{
    userId: string;
    capabilities: WorkspaceCapabilities;
    availableDefinitions: DashboardWidgetDefinition[];
    availableShortcutDefinitions: DashboardShortcutDefinition[];
  }> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "user context required", 403);
    }
    const [projectIds, permissionCodes] = await Promise.all([
      this.projectAccess.listAccessibleProjectIds(ctx),
      Promise.resolve(this.dashboardRepo.listUserPermissionCodes(userId))
    ]);
    const permissions = new Set(permissionCodes);
    const hasReimbursementPermission = [...REIMBURSEMENT_PERMISSION_CODES].some((code) => permissions.has(code));
    const hasReimbursementApprovalPermission = [...REIMBURSEMENT_APPROVAL_PERMISSION_CODES].some((code) => permissions.has(code));
    const hasPendingReimbursementTasks = this.dashboardRepo.hasPendingReimbursementTasks(userId);
    const shouldShowReimbursementStatsByDefault = this.shouldShowReimbursementStatsByDefault(
      permissions,
      hasReimbursementApprovalPermission,
      hasPendingReimbursementTasks
    );
    const canAccessReimbursementWorkspace =
      hasReimbursementPermission || hasReimbursementApprovalPermission || hasPendingReimbursementTasks;
    const canAccessCollaborationWorkspace =
      projectIds.length > 0 || [...COLLABORATION_PERMISSION_CODES].some((code) => permissions.has(code));
    const capabilities: WorkspaceCapabilities = {
      canAccessReimbursementWorkspace,
      canAccessCollaborationWorkspace,
      isReimbursementOnlyUser: canAccessReimbursementWorkspace && !canAccessCollaborationWorkspace,
      isCollaborationOnlyUser: !canAccessReimbursementWorkspace && canAccessCollaborationWorkspace,
      isMixedWorkspaceUser: canAccessReimbursementWorkspace && canAccessCollaborationWorkspace
    };
    const availableDefinitions = DASHBOARD_WIDGET_DEFINITIONS
      .filter((definition) => {
        if (definition.domain === "reimbursement") {
          return canAccessReimbursementWorkspace;
        }
        if (definition.key === "collab.todos" || definition.key === "collab.activities" || definition.key === "collab.announcements") {
          return canAccessCollaborationWorkspace || canAccessReimbursementWorkspace;
        }
        return canAccessCollaborationWorkspace;
      })
      .map((definition) => definition.key === "reimbursement.stats"
        ? { ...definition, defaultVisible: shouldShowReimbursementStatsByDefault }
        : definition);
    const availableShortcutDefinitions = DASHBOARD_SHORTCUT_DEFINITIONS
      .filter((definition) => {
        if (definition.domain === "collab") {
          return canAccessCollaborationWorkspace;
        }
        if (definition.key === "reimbursement.management") {
          return canAccessReimbursementWorkspace && this.hasReimbursementManagementPermission(permissions);
        }
        return canAccessReimbursementWorkspace;
      });

    return { userId, capabilities, availableDefinitions, availableShortcutDefinitions };
  }

  private normalizeWidgetPreferences(
    widgets: DashboardWidgetPreference[],
    availableDefinitions: DashboardWidgetDefinition[]
  ): DashboardWidgetPreference[] {
    const availableKeys = new Set(availableDefinitions.map((definition) => definition.key));
    const overrides = new Map<DashboardWidgetKey, DashboardWidgetPreference>();

    for (const widget of widgets) {
      if (!availableKeys.has(widget.key) || overrides.has(widget.key)) {
        continue;
      }
      const definition = DASHBOARD_WIDGET_DEFINITION_MAP.get(widget.key);
      overrides.set(widget.key, {
        key: widget.key,
        visible: widget.visible,
        order: Number.isFinite(widget.order) ? Math.max(1, Math.round(widget.order)) : definition?.defaultOrder ?? 999
      });
    }

    return availableDefinitions
      .map((definition) => {
        const override = overrides.get(definition.key);
        return {
          key: definition.key,
          visible: override?.visible ?? definition.defaultVisible,
          order: override?.order ?? definition.defaultOrder
        };
      })
      .sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order;
        }
        return (DASHBOARD_WIDGET_DEFINITION_MAP.get(left.key)?.defaultOrder ?? 999) -
          (DASHBOARD_WIDGET_DEFINITION_MAP.get(right.key)?.defaultOrder ?? 999);
      })
      .map((item, index) => ({ ...item, order: index + 1 }));
  }

  private normalizeShortcutPreferences(
    shortcuts: DashboardShortcutPreference[],
    availableDefinitions: DashboardShortcutDefinition[]
  ): DashboardShortcutPreference[] {
    const availableKeys = new Set(availableDefinitions.map((definition) => definition.key));
    const overrides = new Map<DashboardShortcutKey, DashboardShortcutPreference>();

    for (const shortcut of shortcuts) {
      if (!availableKeys.has(shortcut.key) || overrides.has(shortcut.key)) {
        continue;
      }
      const definition = DASHBOARD_SHORTCUT_DEFINITION_MAP.get(shortcut.key);
      overrides.set(shortcut.key, {
        key: shortcut.key,
        visible: shortcut.visible,
        order: Number.isFinite(shortcut.order) ? Math.max(1, Math.round(shortcut.order)) : definition?.defaultOrder ?? 999
      });
    }

    return availableDefinitions
      .map((definition) => {
        const override = overrides.get(definition.key);
        return {
          key: definition.key,
          visible: override?.visible ?? definition.defaultVisible,
          order: override?.order ?? definition.defaultOrder
        };
      })
      .sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order;
        }
        return (DASHBOARD_SHORTCUT_DEFINITION_MAP.get(left.key)?.defaultOrder ?? 999) -
          (DASHBOARD_SHORTCUT_DEFINITION_MAP.get(right.key)?.defaultOrder ?? 999);
      })
      .map((item, index) => ({ ...item, order: index + 1 }));
  }

  private toPreferenceItems(
    widgets: DashboardWidgetPreference[],
    availableDefinitions: DashboardWidgetDefinition[]
  ): DashboardWidgetPreferenceItem[] {
    const available = new Map(availableDefinitions.map((definition) => [definition.key, definition]));
    return widgets
      .map((widget) => {
        const definition = available.get(widget.key);
        if (!definition) {
          return null;
        }
        return {
          ...widget,
          label: definition.label,
          domain: definition.domain,
          defaultVisible: definition.defaultVisible,
          defaultOrder: definition.defaultOrder
        };
      })
      .filter((item): item is DashboardWidgetPreferenceItem => !!item);
  }

  private toShortcutPreferenceItems(
    shortcuts: DashboardShortcutPreference[],
    availableDefinitions: DashboardShortcutDefinition[]
  ): DashboardShortcutPreferenceItem[] {
    const available = new Map(availableDefinitions.map((definition) => [definition.key, definition]));
    return shortcuts
      .map((shortcut) => {
        const definition = available.get(shortcut.key);
        if (!definition) {
          return null;
        }
        return {
          ...shortcut,
          label: definition.label,
          domain: definition.domain,
          defaultVisible: definition.defaultVisible,
          defaultOrder: definition.defaultOrder
        };
      })
      .filter((item): item is DashboardShortcutPreferenceItem => !!item);
  }

  private parseStoredLayout(raw: string | undefined): StoredDashboardLayout {
    if (!raw) {
      return { widgets: [], shortcuts: [] };
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return { widgets: this.parseWidgetPreferencesArray(parsed), shortcuts: [] };
      }
      if (typeof parsed !== "object" || parsed === null) {
        return { widgets: [], shortcuts: [] };
      }
      const maybe = parsed as { widgets?: unknown; shortcuts?: unknown };
      return {
        widgets: Array.isArray(maybe.widgets) ? this.parseWidgetPreferencesArray(maybe.widgets) : [],
        shortcuts: Array.isArray(maybe.shortcuts) ? this.parseShortcutPreferencesArray(maybe.shortcuts) : []
      };
    } catch {
      return { widgets: [], shortcuts: [] };
    }
  }

  private parseStoredWidgetPreferences(raw: string | undefined): DashboardWidgetPreference[] {
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? this.parseWidgetPreferencesArray(parsed) : [];
    } catch {
      return [];
    }
  }

  private parseWidgetPreferencesArray(items: unknown[]): DashboardWidgetPreference[] {
    return items
      .filter((item): item is DashboardWidgetPreference => {
        if (typeof item !== "object" || item === null) {
          return false;
        }
        const maybe = item as Partial<DashboardWidgetPreference>;
        return typeof maybe.key === "string" &&
          DASHBOARD_WIDGET_DEFINITION_MAP.has(maybe.key as DashboardWidgetKey) &&
          typeof maybe.visible === "boolean" &&
          typeof maybe.order === "number";
      })
      .map((item) => ({
        key: item.key,
        visible: item.visible,
        order: item.order
      }));
  }

  private parseShortcutPreferencesArray(items: unknown[]): DashboardShortcutPreference[] {
    return items
      .filter((item): item is DashboardShortcutPreference => {
        if (typeof item !== "object" || item === null) {
          return false;
        }
        const maybe = item as Partial<DashboardShortcutPreference>;
        return typeof maybe.key === "string" &&
          DASHBOARD_SHORTCUT_DEFINITION_MAP.has(maybe.key as DashboardShortcutKey) &&
          typeof maybe.visible === "boolean" &&
          typeof maybe.order === "number";
      })
      .map((item) => ({
        key: item.key,
        visible: item.visible,
        order: item.order
      }));
  }

  private shouldShowReimbursementStatsByDefault(
    permissions: Set<string>,
    hasReimbursementApprovalPermission: boolean,
    hasPendingReimbursementTasks: boolean
  ): boolean {
    if (hasReimbursementApprovalPermission || hasPendingReimbursementTasks) {
      return true;
    }
    return permissions.has("expense.report.view") || permissions.has("expense.review.manage") || permissions.has("expense.rule.manage");
  }

  private hasReimbursementManagementPermission(permissions: Set<string>): boolean {
    return permissions.has("expense.review.manage") || permissions.has("finance.review") || permissions.has("finance.cashier");
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
        .slice(0, DashboardService.ACTIVITY_PREVIEW_LIMIT)
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
      .slice(0, DashboardService.ACTIVITY_PREVIEW_LIMIT);
  }

  private async getReportedIssuesByScope(scope: DashboardScope, ctx: RequestContext): Promise<DashboardReportedIssueItem[]> {
    if (!scope.userId) {
      return [];
    }
    const result = await this.issueQuery.list(
      {
        page: 1,
        pageSize: 10,
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

  private async getReportedIssuesPageByScope(
    scope: DashboardScope,
    query: DashboardReportedIssueListQuery,
    ctx: RequestContext
  ): Promise<DashboardReportedIssueListResult> {
    if (!scope.userId) {
      return { items: [], page: 1, pageSize: 20, total: 0 };
    }
    const result = await this.issueQuery.list(
      {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        projectId: query.projectId?.trim() || undefined,
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
    return {
      items: result.items.map((item) => ({
        entityId: item.id,
        code: item.issueNo,
        title: item.title,
        status: item.status,
        updatedAt: item.updatedAt,
        projectId: item.projectId,
        assigneeName: item.assigneeName
      })),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    };
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
      domain: item.domain,
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
      return [...issueTodos, ...rdTodos].sort((a, b) => this.todoSortAt(b).localeCompare(this.todoSortAt(a)));
    }

    const merged = [...issueTodos, ...rdTodos]
      .sort((a, b) => this.todoSortAt(b).localeCompare(this.todoSortAt(a)))
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
      .sort((a, b) => this.todoSortAt(b).localeCompare(this.todoSortAt(a)))
      .slice(0, limit);
  }

  private todoSortAt(item: DashboardTodoItem): string {
    return item.sortAt ?? item.updatedAt;
  }
}
