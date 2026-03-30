import type { AnnouncementCommandContract, AnnouncementQueryContract } from "../announcement/announcement.contract";
import type { ContentLogQueryContract } from "../content-log/content-log.contract";
import type { IssueQueryContract } from "../issue/issue.contract";
import type { ProfileQueryContract } from "../profile/profile.contract";
import type { ProjectQueryContract } from "../project/project.contract";
import type { RdQueryContract } from "../rd/rd.contract";
import type { RequestContext } from "../../shared/context/request-context";
import type { NotificationCommandContract, NotificationQueryContract } from "./notification.contract";
import type {
  ListNotificationsQuery,
  MarkNotificationReadsInput,
  MarkNotificationReadsResult,
  NotificationItem,
  NotificationListResult
} from "./notification.types";

export class NotificationService implements NotificationQueryContract, NotificationCommandContract {
  constructor(
    private readonly projectQuery: ProjectQueryContract,
    private readonly profileQuery: ProfileQueryContract,
    private readonly announcementCommand: AnnouncementCommandContract,
    private readonly announcementQuery: AnnouncementQueryContract,
    private readonly contentLogQuery: ContentLogQueryContract,
    private readonly issueQuery: IssueQueryContract,
    private readonly rdQuery: RdQueryContract
  ) {}

  async list(query: ListNotificationsQuery, ctx: RequestContext): Promise<NotificationListResult> {
    const userId = ctx.userId ?? null;
    const prefs = await this.profileQuery.getNotificationPrefs(ctx);
    const channelInboxEnabled = prefs.channels?.["inbox"] !== false;
    if (!channelInboxEnabled) {
      return {
        total: 0,
        page: 1,
        pageSize: query.pageSize && query.pageSize > 0 ? Math.floor(query.pageSize) : 20,
        items: []
      };
    }

    const projectResult = await this.projectQuery.listAccessible({ page: 1, pageSize: 200 }, ctx);
    const projectMap = new Map(projectResult.items.map((item) => [item.id, item.name]));
    const effectiveProjectIds = query.projectId?.trim()
      ? [query.projectId.trim()]
      : ctx.roles.includes("admin")
        ? []
        : projectResult.items.map((item) => item.id);
    const pageValue = Number(query.page);
    const pageSizeValue = Number(query.pageSize);
    const limitValue = Number(query.limit);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1;
    const pageSize = Number.isFinite(pageSizeValue) && pageSizeValue > 0
      ? Math.floor(pageSizeValue)
      : Number.isFinite(limitValue) && limitValue > 0
        ? Math.floor(limitValue)
        : 50;

    const [announcements, issueTodos, rdTodos, issueActivities, rdActivities, contentActivities] = await Promise.all([
      this.announcementQuery.listRecentForDashboard(effectiveProjectIds, pageSize * page, ctx),
      userId ? this.issueQuery.listTodosForDashboard(effectiveProjectIds, userId, pageSize * page, ctx) : Promise.resolve([]),
      userId ? this.rdQuery.listTodosForDashboard(effectiveProjectIds, userId, pageSize * page, ctx) : Promise.resolve([]),
      userId ? this.issueQuery.listActivitiesForDashboard(effectiveProjectIds, userId, pageSize * page, ctx) : Promise.resolve([]),
      userId ? this.rdQuery.listActivitiesForDashboard(effectiveProjectIds, userId, pageSize * page, ctx) : Promise.resolve([]),
      this.contentLogQuery.listRecent(effectiveProjectIds, pageSize * page, ["published", "archived"])
    ]);
    const filteredIssueTodos = issueTodos.filter((item) => {
      if (item.kind === "issue_assigned") {
        return prefs.events?.["issue_assigned"] !== false;
      }
      if (item.kind === "issue_verify") {
        return prefs.events?.["issue_status_changed"] !== false;
      }
      return true;
    });
    const filteredRdTodos = rdTodos.filter((item) => {
      if (item.kind === "rd_assigned") {
        return prefs.events?.["rd_assigned"] !== false;
      }
      return true;
    });
    const filteredIssueActivities = issueActivities.filter((item) => this.allowIssueActivity(item.action, prefs.events ?? {}));
    const filteredRdActivities = rdActivities.filter((item) => this.allowRdActivity(item.action, prefs.events ?? {}));
    const filteredContentActivities = contentActivities.filter((item) => {
      if (item.contentType === "announcement") {
        return prefs.events?.["announcement_published"] !== false;
      }
      if (item.contentType === "release") {
        return prefs.events?.["release_published"] !== false;
      }
      return true;
    });
    const filteredAnnouncements = announcements.filter(() => prefs.events?.["announcement_published"] !== false);
    const announcementReadVersions =
      filteredAnnouncements.length > 0
        ? await this.announcementQuery.getReadVersions(filteredAnnouncements.map((item) => item.id), ctx)
        : new Map();

    const items: NotificationItem[] = [
      ...filteredIssueTodos.map((item) => ({
        id: `todo:${item.kind}:${item.entityId}`,
        kind: "todo" as const,
        unread: true,
        sourceLabel: item.kind.startsWith("issue") ? "Issue" : "研发项",
        title: item.title,
        description: `${item.code} · ${this.todoLabel(item.kind)}`,
        time: item.updatedAt,
        projectId: item.projectId,
        projectName: this.projectNameOf(projectMap, item.projectId),
        route: item.kind.startsWith("issue") ? `/issues?detail=${item.entityId}` : "/rd"
      })),
      ...filteredRdTodos.map((item) => ({
        id: `todo:${item.kind}:${item.entityId}`,
        kind: "todo" as const,
        unread: true,
        sourceLabel: "研发项",
        title: item.title,
        description: `${item.code} · ${this.todoLabel(item.kind)}`,
        time: item.updatedAt,
        projectId: item.projectId,
        projectName: this.projectNameOf(projectMap, item.projectId),
        route: `/rd?detail=${item.entityId}`
      })),
      ...filteredIssueActivities.map((item) => ({
        id: `activity:${item.kind}:${item.entityId}:${item.createdAt}`,
        kind: "activity" as const,
        unread: true,
        sourceLabel: "测试单动态",
        title: item.title,
        description: item.summary || `${item.code} · ${item.action}`,
        time: item.createdAt,
        projectId: item.projectId,
        projectName: this.projectNameOf(projectMap, item.projectId),
        route: `/issues?detail=${item.entityId}`
      })),
      ...filteredRdActivities.map((item) => ({
        id: `activity:${item.kind}:${item.entityId}:${item.createdAt}`,
        kind: "activity" as const,
        unread: true,
        sourceLabel: "研发动态",
        title: item.title,
        description: item.summary || `${item.code} · ${item.action}`,
        time: item.createdAt,
        projectId: item.projectId,
        projectName: this.projectNameOf(projectMap, item.projectId),
        route: `/rd?detail=${item.entityId}`
      })),
      ...filteredContentActivities
        .filter((item) => !(item.contentType === "announcement" && item.actionType === "published"))
        .map((item) => ({
        id: `activity:content:${item.contentType}:${item.actionType}:${item.id}`,
        kind: "activity" as const,
        unread: true,
        sourceLabel: this.contentSourceLabel(item.contentType),
        title: item.title,
        description: item.summary || this.contentActionLabel(item.contentType, item.actionType),
        time: item.createdAt,
        projectId: item.projectId,
        projectName: this.projectNameOf(projectMap, item.projectId),
        route: "/content"
      })),
      ...filteredAnnouncements.map((item) => ({
        id: `announcement:${item.id}`,
        kind: "activity" as const,
        unread: announcementReadVersions.get(item.id) !== item.updatedAt,
        sourceLabel: "公告动态",
        title: item.title,
        description: item.summary || (item.pinned ? "置顶公告" : "最新公告"),
        time: item.publishAt || item.updatedAt,
        projectId: item.projectId,
        projectName: this.projectNameOf(projectMap, item.projectId),
        route: "/content"
      }))
    ];

    const keyword = query.keyword?.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (query.kind && item.kind !== query.kind) {
        return false;
      }
      if (query.projectId && item.projectId !== query.projectId) {
        return false;
      }
      if (keyword) {
        const haystack = `${item.title} ${item.description} ${item.projectName} ${item.sourceLabel}`.toLowerCase();
        return haystack.includes(keyword);
      }
      return true;
    });

    const sorted = filtered.sort((a, b) => (b.time || "").localeCompare(a.time || ""));
    const start = (page - 1) * pageSize;

    return {
      total: sorted.length,
      page,
      pageSize,
      items: sorted.slice(start, start + pageSize)
    };
  }

  async markRead(input: MarkNotificationReadsInput, ctx: RequestContext): Promise<MarkNotificationReadsResult> {
    const ids = input.announcementIds ?? [];
    const updated = await this.announcementCommand.markReadBatch(ids, ctx);
    return { updated };
  }

  private projectNameOf(projectMap: Map<string, string>, projectId: string | null): string {
    return projectId ? (projectMap.get(projectId) ?? "未命名项目") : "全局";
  }

  private todoLabel(kind: string): string {
    return (
      {
        issue_assigned: "分配给我的问题",
        issue_verify: "待我验证的问题",
        rd_assigned: "分配给我的研发项",
        rd_review: "待我验收的研发项"
      }[kind] || "待办"
    );
  }

  private contentSourceLabel(contentType: string): string {
    return (
      {
        announcement: "公告动态",
        document: "文档动态",
        release: "发布动态"
      }[contentType] || "内容动态"
    );
  }

  private contentActionLabel(contentType: string, actionType: string): string {
    if (contentType === "announcement") {
      return actionType === "published" ? "公告已发布" : "公告已下线";
    }
    if (contentType === "document") {
      return actionType === "published" ? "文档已发布" : "文档已归档";
    }
    if (contentType === "release") {
      return actionType === "published" ? "版本已发布" : "版本已作废";
    }
    return "内容状态已更新";
  }

  private allowIssueActivity(action: string, events: Record<string, boolean>): boolean {
    if (["assign", "claim"].includes(action)) {
      return events["issue_assigned"] !== false;
    }
    if (["start", "resolve", "verify", "reopen", "close"].includes(action)) {
      return events["issue_status_changed"] !== false;
    }
    if (action === "update") {
      return events["issue_commented"] !== false;
    }
    return true;
  }

  private allowRdActivity(action: string, events: Record<string, boolean>): boolean {
    if (["start", "block", "resume", "complete", "accept", "close", "advance_stage"].includes(action)) {
      return events["rd_status_changed"] !== false;
    }
    if (action === "update") {
      return events["rd_commented"] !== false;
    }
    if (action === "create") {
      return events["rd_assigned"] !== false;
    }
    return true;
  }
}
