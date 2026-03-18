import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import type { AdminUserProfile } from "../auth/auth.types";
import { AnnouncementService } from "../announcement/announcement.service";
import { DocumentService } from "../document/document.service";
import { IssueRepo } from "../issue/issue.repo";
import type { IssueEntity, IssuePriority, IssueStatus } from "../issue/issue.types";
import { ProjectMemberService } from "../project/project-member.service";
import { ProjectService } from "../project/project.service";
import { RdService } from "../rd/rd.service";
import type { RdItemStatus } from "../rd/rd.types";
import { DashboardRepo } from "./dashboard.repo";
import type {
  DashboardActivityItem,
  DashboardPendingItem,
  DashboardProjectOption,
  DashboardStatCardData,
  DashboardStatCardFilters,
  DashboardStatCardKey,
  DashboardStatCardPreferenceInput,
  DashboardStatCardPreferenceItem,
  DashboardStatPreferencesResult,
  DashboardViewData
} from "./dashboard.types";

type DocCategory = "guide" | "faq" | "release-note" | "spec" | "policy" | "other";

type DocListItem = {
  id: string;
  projectId?: string | null;
  title: string;
  category: DocCategory;
  summary?: string | null;
  updatedAt: string;
  createdBy?: string | null;
};

type ProjectIssueRef = {
  issue: IssueEntity;
  project: DashboardProjectOption;
};

type DashboardStatDefinition = Omit<DashboardStatCardPreferenceItem, "enabled" | "order" | "filters">;

type DashboardStatMetric = {
  value: string;
  queryParams?: Record<string, string | number | boolean | null | undefined>;
};

type DashboardStatContext = {
  currentUserId: string;
  projects: DashboardProjectOption[];
  pendingIssues: ProjectIssueRef[];
  verifyIssues: ProjectIssueRef[];
  reportedIssues: ProjectIssueRef[];
  recentDocs: DocListItem[];
  announcementCount: number;
};

const DASHBOARD_STAT_DEFINITIONS: DashboardStatDefinition[] = [
  {
    key: "pending",
    label: "待我处理",
    helper: "当前分配给我的未完成事项",
    icon: "deployment-unit",
    tone: "blue",
    route: "/issues",
    defaultEnabled: true,
    defaultOrder: 1,
    supportsPriorityScope: true,
    supportsProjectIds: true
  },
  {
    key: "verify",
    label: "待我验证",
    helper: "等待我确认或复测的问题",
    icon: "safety-certificate",
    tone: "violet",
    route: "/issues",
    defaultEnabled: true,
    defaultOrder: 2,
    supportsPriorityScope: true,
    supportsProjectIds: true
  },
  {
    key: "rd-doing",
    label: "研发中",
    helper: "当前我在推进的研发项",
    icon: "rocket",
    tone: "green",
    route: "/rd",
    defaultEnabled: true,
    defaultOrder: 3,
    supportsPriorityScope: false,
    supportsProjectIds: true
  },
  {
    key: "reported-issues",
    label: "我提报的",
    helper: "由我创建的问题总数",
    icon: "bug",
    tone: "amber",
    route: "/issues",
    defaultEnabled: true,
    defaultOrder: 4,
    supportsPriorityScope: true,
    supportsProjectIds: true
  },
  {
    key: "reported-active",
    label: "待跟进提报",
    helper: "我提报且仍未结束的问题",
    icon: "alert",
    tone: "amber",
    route: "/issues",
    defaultEnabled: false,
    defaultOrder: 5,
    supportsPriorityScope: true,
    supportsProjectIds: true
  },
  {
    key: "rd-blocked",
    label: "研发阻塞",
    helper: "当前由我负责且阻塞中的研发项",
    icon: "warning",
    tone: "rose",
    route: "/rd",
    defaultEnabled: false,
    defaultOrder: 6,
    supportsPriorityScope: false,
    supportsProjectIds: true
  },
  {
    key: "rd-review",
    label: "待我验收",
    helper: "等待我验收的研发项",
    icon: "check-circle",
    tone: "violet",
    route: "/rd",
    defaultEnabled: false,
    defaultOrder: 7,
    supportsPriorityScope: false,
    supportsProjectIds: true
  },
  {
    key: "announcements",
    label: "已发布公告",
    helper: "当前按已发布公告统计",
    icon: "notification",
    tone: "rose",
    route: "/announcements",
    defaultEnabled: true,
    defaultOrder: 8,
    supportsPriorityScope: false,
    supportsProjectIds: false
  },
  {
    key: "docs",
    label: "最近更新文档",
    helper: "最近 7 天发生更新",
    icon: "file-text",
    tone: "slate",
    route: "/docs",
    defaultEnabled: true,
    defaultOrder: 9,
    supportsPriorityScope: false,
    supportsProjectIds: false
  },
  {
    key: "projects",
    label: "参与项目",
    helper: "当前可访问的进行中项目",
    icon: "appstore",
    tone: "blue",
    route: "/projects",
    defaultEnabled: true,
    defaultOrder: 10,
    supportsPriorityScope: false,
    supportsProjectIds: false
  }
];

const DASHBOARD_STAT_DEFINITION_MAP = new Map(
  DASHBOARD_STAT_DEFINITIONS.map((item) => [item.key, item])
);

export class DashboardService {
  private readonly pendingStatuses = new Set<IssueStatus>(["open", "in_progress", "reopened"]);
  private readonly reportedActiveStatuses = new Set<IssueStatus>(["open", "in_progress", "resolved", "reopened"]);

  constructor(
    private readonly repo: DashboardRepo,
    private readonly projectService: ProjectService,
    private readonly projectMemberService: ProjectMemberService,
    private readonly announcementService: AnnouncementService,
    private readonly documentService: DocumentService,
    private readonly issueRepo: IssueRepo,
    private readonly rdService: RdService
  ) {}

  loadDashboard(profile: AdminUserProfile): DashboardViewData {
    const currentUserId = this.currentUserId(profile);
    const projects = this.listAccessibleProjects(profile, currentUserId);
    const projectIds = projects.map((item) => item.id);
    const projectNameMap = new Map(projects.map((item) => [item.id, item.name]));

    const announcementResult = this.loadAnnouncements(currentUserId, projectIds);
    const docResult = this.documentService.list({
      status: "published",
      page: 1,
      pageSize: 10
    });
    const issueData = this.loadIssueCollections(projects, currentUserId, projectIds);
    const recentDocs = docResult.items
      .filter((item) => this.isWithinDays(item.updatedAt, 7))
      .sort((left, right) => this.compareTime(right.updatedAt, left.updatedAt));
    const currentDoingRdCount = this.countRdItems(projectIds, currentUserId, {
      status: "doing",
      assigneeId: currentUserId
    });
    const statPreferences = this.loadStatPreferencesInternal(profile, projects);

    return {
      hero: {
        displayName: this.displayName(profile),
        roleLabel: this.roleLabel(profile),
        summary: `你当前有 ${issueData.pending.length} 条待处理事项，${issueData.verify.length} 条待验证，${currentDoingRdCount} 条研发中事项，${announcementResult.total} 条已发布公告`,
        lastLoginAt: profile.lastLoginAt ?? null
      },
      stats: this.buildStats(statPreferences.cards, {
        currentUserId,
        projects,
        pendingIssues: issueData.pending,
        verifyIssues: issueData.verify,
        reportedIssues: issueData.reported,
        recentDocs,
        announcementCount: announcementResult.total
      }),
      pendingItems: this.buildPendingItems(issueData.pending),
      activityItems: this.buildActivities(profile, issueData.assigned, issueData.reported, docResult.items, projectNameMap).slice(0, 6),
      announcementItems: announcementResult.items.slice(0, 4).map((item) => ({
        id: item.id,
        title: item.title,
        summary: this.withFallback(item.summary, "暂无公告摘要"),
        publishAt: item.publishAt || item.createdAt,
        badgeText: item.pinned ? "置顶" : "公告",
        route: "/announcements"
      })),
      documentItems: recentDocs.slice(0, 4).map((item) => ({
        id: item.id,
        title: item.title,
        summary: this.withFallback(item.summary, "暂无文档摘要"),
        projectName: item.projectId ? projectNameMap.get(item.projectId) || "未命名项目" : "通用文档",
        categoryLabel: this.docCategoryLabel(item.category),
        updatedAt: item.updatedAt,
        route: "/docs"
      }))
    };
  }

  loadStatPreferences(profile: AdminUserProfile): DashboardStatPreferencesResult {
    const projects = this.listAccessibleProjects(profile, this.currentUserId(profile));
    return this.loadStatPreferencesInternal(profile, projects);
  }

  updateStatPreferences(
    profile: AdminUserProfile,
    input: { cards: DashboardStatCardPreferenceInput[] }
  ): DashboardStatPreferencesResult {
    const projects = this.listAccessibleProjects(profile, this.currentUserId(profile));
    const normalized = this.normalizeStatPreferences(input.cards, projects);

    if (!normalized.some((item) => item.enabled)) {
      throw new AppError("DASHBOARD_STAT_REQUIRED", "at least one dashboard stat card must be enabled", 400);
    }

    const preferenceUserId = this.preferenceUserId(profile);
    const existing = this.repo.findPreferenceByUserId(preferenceUserId);
    const now = nowIso();

    this.repo.savePreference({
      id: existing?.id ?? genId("dpf"),
      userId: preferenceUserId,
      statsConfigJson: JSON.stringify(normalized),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    });

    return {
      cards: this.toPreferenceItems(normalized),
      availableProjects: projects,
      updatedAt: now
    };
  }

  private loadAnnouncements(currentUserId: string, projectIds: string[]) {
    return this.projectMemberService.isAdmin(currentUserId)
      ? this.announcementService.listWithReadState(currentUserId, {
          status: "published",
          page: 1,
          pageSize: 8
        })
      : this.announcementService.listByProjectIdsWithReadState(
          currentUserId,
          projectIds,
          {
            status: "published",
            page: 1,
            pageSize: 8
          },
          { includeGlobal: true }
        );
  }

  private loadIssueCollections(projects: DashboardProjectOption[], currentUserId: string, projectIds: string[]) {
    const assignedResult = this.issueRepo.listByProjectIds(projectIds, {
      assigneeId: currentUserId,
      page: 1,
      pageSize: 1000
    });
    const allIssueResult = this.issueRepo.listByProjectIds(projectIds, {
      page: 1,
      pageSize: 1000
    });

    const assigned = assignedResult.items
      .map((issue) => this.toProjectIssueRef(projects, issue))
      .filter((item): item is ProjectIssueRef => !!item);
    const reported = allIssueResult.items
      .filter((item) => item.reporterId === currentUserId)
      .map((issue) => this.toProjectIssueRef(projects, issue))
      .filter((item): item is ProjectIssueRef => !!item);

    return {
      assigned,
      reported,
      pending: assigned
        .filter(({ issue }) => this.pendingStatuses.has(issue.status))
        .sort((left, right) => this.compareTime(right.issue.updatedAt, left.issue.updatedAt)),
      verify: reported
        .filter(({ issue }) => issue.status === "resolved")
        .sort((left, right) => this.compareTime(right.issue.updatedAt, left.issue.updatedAt))
    };
  }

  private loadStatPreferencesInternal(
    profile: AdminUserProfile,
    projects: DashboardProjectOption[]
  ): DashboardStatPreferencesResult {
    const preferenceUserId = this.preferenceUserId(profile);
    const record = this.repo.findPreferenceByUserId(preferenceUserId);
    const normalized = this.normalizeStatPreferences(this.parseStoredStatPreferences(record?.statsConfigJson), projects);

    return {
      cards: this.toPreferenceItems(normalized),
      availableProjects: projects,
      updatedAt: record?.updatedAt ?? null
    };
  }

  private listAccessibleProjects(profile: AdminUserProfile, currentUserId: string): DashboardProjectOption[] {
    const query = {
      status: "active" as const,
      page: 1,
      pageSize: 200
    };
    const result = profile.role === "admin"
      ? this.projectService.list(query)
      : this.projectService.listForUser(currentUserId, query);

    return result.items.map((item) => ({ id: item.id, name: item.name }));
  }

  private buildStats(preferences: DashboardStatCardPreferenceItem[], context: DashboardStatContext): DashboardStatCardData[] {
    return preferences
      .filter((item) => item.enabled)
      .map((item) => this.buildStatCard(item, this.resolveStatMetric(item, context)));
  }

  private resolveStatMetric(preference: DashboardStatCardPreferenceItem, context: DashboardStatContext): DashboardStatMetric {
    const projectIds = this.resolveProjectFilter(preference.filters, context.projects.map((item) => item.id));

    switch (preference.key) {
      case "pending":
        return {
          value: String(this.filterIssueRefs(context.pendingIssues, preference.filters).length),
          queryParams: this.buildIssueQueryParams(projectIds, preference.filters?.priorityScope, context.currentUserId)
        };
      case "verify":
        return {
          value: String(this.filterIssueRefs(context.verifyIssues, preference.filters).length),
          queryParams: this.buildIssueQueryParams(projectIds, preference.filters?.priorityScope)
        };
      case "rd-doing":
        return {
          value: String(this.countRdItems(projectIds, context.currentUserId, { status: "doing", assigneeId: context.currentUserId })),
          queryParams: this.buildRdQueryParams(projectIds, "doing", context.currentUserId)
        };
      case "reported-issues":
        return {
          value: String(this.filterIssueRefs(context.reportedIssues, preference.filters).length),
          queryParams: this.buildIssueQueryParams(projectIds, preference.filters?.priorityScope)
        };
      case "reported-active":
        return {
          value: String(
            this.filterIssueRefs(context.reportedIssues, preference.filters)
              .filter(({ issue }) => this.reportedActiveStatuses.has(issue.status)).length
          ),
          queryParams: this.buildIssueQueryParams(projectIds, preference.filters?.priorityScope)
        };
      case "rd-blocked":
        return {
          value: String(this.countRdItems(projectIds, context.currentUserId, { status: "blocked", assigneeId: context.currentUserId })),
          queryParams: this.buildRdQueryParams(projectIds, "blocked", context.currentUserId)
        };
      case "rd-review":
        return {
          value: String(this.countRdItems(projectIds, context.currentUserId, { status: "done", reviewerId: context.currentUserId })),
          queryParams: this.buildRdQueryParams(projectIds, "done", undefined, context.currentUserId)
        };
      case "announcements":
        return { value: String(context.announcementCount) };
      case "docs":
        return { value: String(context.recentDocs.length) };
      case "projects":
        return { value: String(context.projects.length) };
      default:
        return { value: "0" };
    }
  }

  private buildStatCard(preference: DashboardStatCardPreferenceItem, metric: DashboardStatMetric): DashboardStatCardData {
    return {
      key: preference.key,
      label: preference.label,
      value: metric.value,
      helper: preference.helper,
      icon: preference.icon,
      tone: preference.tone,
      route: preference.route,
      queryParams: metric.queryParams
    };
  }

  private buildIssueQueryParams(
    projectIds: string[],
    priorityScope?: DashboardStatCardFilters["priorityScope"],
    assigneeId?: string
  ): Record<string, string | undefined> | undefined {
    const projectId = projectIds.length === 1 ? projectIds[0] : undefined;
    const priority = priorityScope === "critical"
      ? "critical"
      : priorityScope === "high_up"
        ? "high"
        : undefined;

    if (!projectId && !priority && !assigneeId) {
      return undefined;
    }

    return {
      projectId,
      priority,
      assigneeId
    };
  }

  private buildRdQueryParams(
    projectIds: string[],
    status?: RdItemStatus,
    assigneeId?: string,
    reviewerId?: string
  ): Record<string, string | undefined> | undefined {
    const projectId = projectIds.length === 1 ? projectIds[0] : undefined;
    if (!projectId && !status && !assigneeId && !reviewerId) {
      return undefined;
    }

    return {
      projectId,
      status,
      assigneeId,
      reviewerId
    };
  }

  private countRdItems(
    projectIds: string[],
    operatorId: string,
    query: {
      status?: RdItemStatus;
      assigneeId?: string;
      reviewerId?: string;
    }
  ): number {
    if (projectIds.length === 0) {
      return 0;
    }

    return projectIds.reduce((total, projectId) => {
      const result = this.rdService.list(
        projectId,
        {
          status: query.status,
          assigneeId: query.assigneeId,
          page: 1,
          pageSize: 1000
        },
        { operatorId }
      );

      const items = query.reviewerId
        ? result.items.filter((item) => item.reviewerId === query.reviewerId)
        : result.items;

      return total + items.length;
    }, 0);
  }

  private filterIssueRefs(items: ProjectIssueRef[], filters?: DashboardStatCardFilters): ProjectIssueRef[] {
    return items.filter(({ issue, project }) => {
      if (filters?.projectIds?.length && !filters.projectIds.includes(project.id)) {
        return false;
      }
      return this.matchesPriorityScope(issue.priority, filters?.priorityScope);
    });
  }

  private matchesPriorityScope(priority: IssuePriority, scope?: DashboardStatCardFilters["priorityScope"]): boolean {
    if (!scope || scope === "all") {
      return true;
    }
    if (scope === "critical") {
      return priority === "critical";
    }
    return priority === "high" || priority === "critical";
  }

  private resolveProjectFilter(filters: DashboardStatCardFilters | undefined, accessibleProjectIds: string[]): string[] {
    if (!filters?.projectIds?.length) {
      return accessibleProjectIds;
    }

    const allowed = new Set(accessibleProjectIds);
    const projectIds = Array.from(new Set(filters.projectIds.map((item) => item.trim()).filter(Boolean)))
      .filter((item) => allowed.has(item));

    return projectIds.length > 0 ? projectIds : accessibleProjectIds;
  }

  private buildPendingItems(pendingIssues: ProjectIssueRef[]): DashboardPendingItem[] {
    return pendingIssues.slice(0, 5).map(({ issue, project }) => ({
      id: issue.id,
      title: issue.title,
      typeLabel: this.issueTypeLabel(issue.type),
      projectName: project.name,
      statusLabel: this.issueDisplayStatusLabel(issue.status),
      statusColor: this.issueDisplayStatusColor(issue.status),
      priorityLabel: this.issuePriorityLabel(issue.priority),
      priorityColor: this.issuePriorityColor(issue.priority),
      updatedAt: issue.updatedAt,
      route: "/issues",
      queryParams: { projectId: project.id, issueId: issue.id }
    }));
  }

  private buildActivities(
    profile: AdminUserProfile,
    assignedIssues: ProjectIssueRef[],
    reportedIssues: ProjectIssueRef[],
    docs: DocListItem[],
    projectNameMap: Map<string, string>
  ): DashboardActivityItem[] {
    const items: DashboardActivityItem[] = [];

    for (const item of reportedIssues.slice(0, 6)) {
      items.push({
        id: `report-${item.issue.id}`,
        title: "我提交了一个问题",
        detail: `${item.issue.title} · ${item.project.name}`,
        occurredAt: item.issue.createdAt,
        icon: "form",
        tone: "blue",
        route: "/issues",
        queryParams: { projectId: item.project.id, issueId: item.issue.id }
      });
    }

    for (const item of assignedIssues.slice(0, 6)) {
      const isPending = item.issue.status === "open" || item.issue.status === "reopened";
      items.push({
        id: `assign-${item.issue.id}`,
        title: isPending ? "我被分配了一个任务" : "我处理了一个问题",
        detail: `${item.issue.title} · ${item.project.name} · ${this.issueDisplayStatusLabel(item.issue.status)}`,
        occurredAt: item.issue.updatedAt,
        icon: isPending ? "deployment-unit" : "tool",
        tone: isPending ? "violet" : "green",
        route: "/issues",
        queryParams: { projectId: item.project.id, issueId: item.issue.id }
      });
    }

    for (const doc of docs.filter((item) => this.matchesCurrentActor(item.createdBy, profile)).slice(0, 6)) {
      items.push({
        id: `doc-${doc.id}`,
        title: "我更新了一个文档",
        detail: `${doc.title} · ${doc.projectId ? projectNameMap.get(doc.projectId) || "未命名项目" : "通用文档"}`,
        occurredAt: doc.updatedAt,
        icon: "file-text",
        tone: "amber",
        route: "/docs"
      });
    }

    return items.sort((left, right) => this.compareTime(right.occurredAt, left.occurredAt));
  }

  private toPreferenceItems(preferences: DashboardStatCardPreferenceInput[]): DashboardStatCardPreferenceItem[] {
    return preferences.map((item) => {
      const definition = this.findDefinition(item.key);
      return {
        key: item.key,
        label: definition.label,
        helper: definition.helper,
        icon: definition.icon,
        tone: definition.tone,
        route: definition.route,
        enabled: item.enabled,
        order: item.order,
        filters: item.filters,
        defaultEnabled: definition.defaultEnabled,
        defaultOrder: definition.defaultOrder,
        supportsPriorityScope: definition.supportsPriorityScope,
        supportsProjectIds: definition.supportsProjectIds
      };
    });
  }

  private normalizeStatPreferences(
    cards: DashboardStatCardPreferenceInput[],
    projects: DashboardProjectOption[]
  ): DashboardStatCardPreferenceInput[] {
    const accessibleProjectIds = projects.map((item) => item.id);
    const overrides = new Map<DashboardStatCardKey, DashboardStatCardPreferenceInput>();

    for (const item of cards) {
      if (!this.isStatCardKey(item.key) || overrides.has(item.key)) {
        continue;
      }

      const definition = this.findDefinition(item.key);
      overrides.set(item.key, {
        key: item.key,
        enabled: !!item.enabled,
        order: Number.isFinite(item.order) ? Math.max(1, Math.round(item.order)) : definition.defaultOrder,
        filters: this.normalizeFilters(item.filters, definition, accessibleProjectIds)
      });
    }

    return DASHBOARD_STAT_DEFINITIONS
      .map((definition) => {
        const override = overrides.get(definition.key);
        return {
          key: definition.key,
          enabled: override?.enabled ?? definition.defaultEnabled,
          order: override?.order ?? definition.defaultOrder,
          filters: this.normalizeFilters(override?.filters, definition, accessibleProjectIds)
        };
      })
      .sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order;
        }
        return this.findDefinition(left.key).defaultOrder - this.findDefinition(right.key).defaultOrder;
      })
      .map((item, index) => ({
        ...item,
        order: index + 1
      }));
  }

  private normalizeFilters(
    filters: DashboardStatCardFilters | undefined,
    definition: DashboardStatDefinition,
    accessibleProjectIds: string[]
  ): DashboardStatCardFilters | undefined {
    const next: DashboardStatCardFilters = {};

    if (definition.supportsPriorityScope) {
      next.priorityScope = filters?.priorityScope === "critical" || filters?.priorityScope === "high_up"
        ? filters.priorityScope
        : "all";
    }

    if (definition.supportsProjectIds) {
      const allowed = new Set(accessibleProjectIds);
      const projectIds = Array.from(new Set((filters?.projectIds || []).map((item) => item.trim()).filter(Boolean)))
        .filter((item) => allowed.has(item));

      if (projectIds.length > 0 && projectIds.length < accessibleProjectIds.length) {
        next.projectIds = projectIds;
      }
    }

    return Object.keys(next).length > 0 ? next : undefined;
  }

  private parseStoredStatPreferences(raw: string | undefined): DashboardStatCardPreferenceInput[] {
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((item): item is DashboardStatCardPreferenceInput => {
          if (typeof item !== "object" || item === null) {
            return false;
          }

          const maybe = item as Partial<DashboardStatCardPreferenceInput>;
          return this.isStatCardKey(maybe.key) && typeof maybe.enabled === "boolean" && typeof maybe.order === "number";
        })
        .map((item) => ({
          key: item.key,
          enabled: item.enabled,
          order: item.order,
          filters: item.filters
        }));
    } catch {
      return [];
    }
  }

  private findDefinition(key: DashboardStatCardKey): DashboardStatDefinition {
    const hit = DASHBOARD_STAT_DEFINITION_MAP.get(key);
    if (!hit) {
      throw new AppError("DASHBOARD_STAT_UNKNOWN", `unsupported dashboard stat card: ${key}`, 400);
    }
    return hit;
  }

  private isStatCardKey(value: unknown): value is DashboardStatCardKey {
    return typeof value === "string" && DASHBOARD_STAT_DEFINITION_MAP.has(value as DashboardStatCardKey);
  }

  private toProjectIssueRef(projects: DashboardProjectOption[], issue: IssueEntity): ProjectIssueRef | null {
    const project = projects.find((item) => item.id === issue.projectId);
    return project ? { issue, project } : null;
  }

  private currentUserId(profile: AdminUserProfile): string {
    return profile.userId?.trim() || profile.id;
  }

  private preferenceUserId(profile: AdminUserProfile): string {
    return profile.id;
  }

  private displayName(profile: AdminUserProfile): string {
    const name = profile.nickname?.trim();
    return name && name.length > 0 ? name : profile.username;
  }

  private roleLabel(profile: AdminUserProfile): string {
    return profile.role === "admin" ? "管理员" : "项目成员";
  }

  private matchesCurrentActor(createdBy: string | null | undefined, profile: AdminUserProfile): boolean {
    const actor = createdBy?.trim().toLowerCase();
    if (!actor) {
      return false;
    }

    const candidates = [profile.id, profile.userId, profile.username, profile.nickname]
      .filter((item): item is string => !!item && item.trim().length > 0)
      .map((item) => item.trim().toLowerCase());

    return candidates.includes(actor);
  }

  private issueDisplayStatusLabel(status: IssueStatus): string {
    if (status === "open") return "待处理";
    if (status === "in_progress") return "处理中";
    if (status === "resolved") return "已解决";
    if (status === "verified") return "已验证";
    if (status === "closed") return "已关闭";
    if (status === "reopened") return "已重开";
    return status;
  }

  private issueDisplayStatusColor(status: IssueStatus): string {
    if (status === "resolved") return "#2F54EB";
    if (status === "verified") return "#389E0D";
    if (status === "closed") return "#595959";
    if (status === "reopened") return "#FA541C";
    if (status === "in_progress") return "#722ED1";
    return "#FA8C16";
  }

  private issuePriorityLabel(priority: IssueEntity["priority"]): string {
    if (priority === "critical") return "紧急";
    if (priority === "high") return "高";
    if (priority === "medium") return "中";
    if (priority === "low") return "低";
    return priority;
  }

  private issuePriorityColor(priority: IssueEntity["priority"]): string {
    if (priority === "critical") return "#CF1322";
    if (priority === "high") return "#FA541C";
    if (priority === "medium") return "#FAAD14";
    return "#52C41A";
  }

  private issueTypeLabel(type: IssueEntity["type"]): string {
    if (type === "bug") return "缺陷";
    if (type === "feature") return "需求";
    if (type === "change") return "变更";
    if (type === "improvement") return "优化";
    if (type === "task") return "任务";
    if (type === "test") return "测试";
    return type;
  }

  private docCategoryLabel(category: DocCategory): string {
    if (category === "guide") return "指南";
    if (category === "faq") return "FAQ";
    if (category === "release-note") return "发布说明";
    if (category === "spec") return "规范";
    if (category === "policy") return "策略";
    return "其他";
  }

  private withFallback(value: string | null | undefined, fallback: string): string {
    const text = value?.trim();
    return text && text.length > 0 ? text : fallback;
  }

  private isWithinDays(value: string, days: number): boolean {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return false;
    }

    return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
  }

  private compareTime(left: string, right: string): number {
    return this.safeTime(left) - this.safeTime(right);
  }

  private safeTime(value: string | null | undefined): number {
    const timestamp = value ? Date.parse(value) : Number.NaN;
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
