import type { AnnouncementQueryContract } from "../announcement/announcement.contract";
import type { IssueQueryContract } from "../issue/issue.contract";
import type { ProjectQueryContract } from "../project/project.contract";
import type { RdQueryContract } from "../rd/rd.contract";
import type { RequestContext } from "../../shared/context/request-context";
import type { NotificationQueryContract } from "./notification.contract";
import type { ListNotificationsQuery, NotificationItem, NotificationListResult } from "./notification.types";

export class NotificationService implements NotificationQueryContract {
  constructor(
    private readonly projectQuery: ProjectQueryContract,
    private readonly announcementQuery: AnnouncementQueryContract,
    private readonly issueQuery: IssueQueryContract,
    private readonly rdQuery: RdQueryContract
  ) {}

  async list(query: ListNotificationsQuery, ctx: RequestContext): Promise<NotificationListResult> {
    const userId = ctx.userId ?? null;
    const projectResult = await this.projectQuery.listAccessible({ page: 1, pageSize: 200 }, ctx);
    const projectMap = new Map(projectResult.items.map((item) => [item.id, item.name]));
    const effectiveProjectIds = query.projectId?.trim()
      ? [query.projectId.trim()]
      : ctx.roles.includes("admin")
        ? []
        : projectResult.items.map((item) => item.id);
    const limit = query.limit && query.limit > 0 ? query.limit : 50;

    const [announcements, issueTodos, rdTodos, issueActivities, rdActivities] = await Promise.all([
      this.announcementQuery.listRecentForDashboard(effectiveProjectIds, limit, ctx),
      userId ? this.issueQuery.listTodosForDashboard(effectiveProjectIds, userId, limit, ctx) : Promise.resolve([]),
      userId ? this.rdQuery.listTodosForDashboard(effectiveProjectIds, userId, limit, ctx) : Promise.resolve([]),
      userId ? this.issueQuery.listActivitiesForDashboard(effectiveProjectIds, userId, limit, ctx) : Promise.resolve([]),
      userId ? this.rdQuery.listActivitiesForDashboard(effectiveProjectIds, userId, limit, ctx) : Promise.resolve([])
    ]);

    const items: NotificationItem[] = [
      ...issueTodos.map((item) => ({
        id: `todo:${item.kind}:${item.entityId}`,
        kind: "todo" as const,
        sourceLabel: item.kind.startsWith("issue") ? "Issue" : "研发项",
        title: item.title,
        description: `${item.code} · ${this.todoLabel(item.kind)}`,
        time: item.updatedAt,
        projectId: item.projectId,
        projectName: this.projectNameOf(projectMap, item.projectId),
        route: item.kind.startsWith("issue") ? `/issues?detail=${item.entityId}` : "/rd"
      })),
      ...rdTodos.map((item) => ({
        id: `todo:${item.kind}:${item.entityId}`,
        kind: "todo" as const,
        sourceLabel: "研发项",
        title: item.title,
        description: `${item.code} · ${this.todoLabel(item.kind)}`,
        time: item.updatedAt,
        projectId: item.projectId,
        projectName: this.projectNameOf(projectMap, item.projectId),
        route: "/rd"
      })),
      ...issueActivities.map((item) => ({
        id: `activity:${item.kind}:${item.entityId}:${item.createdAt}`,
        kind: "activity" as const,
        sourceLabel: "Issue 动态",
        title: item.title,
        description: item.summary || `${item.code} · ${item.action}`,
        time: item.createdAt,
        projectId: item.projectId,
        projectName: this.projectNameOf(projectMap, item.projectId),
        route: `/issues?detail=${item.entityId}`
      })),
      ...rdActivities.map((item) => ({
        id: `activity:${item.kind}:${item.entityId}:${item.createdAt}`,
        kind: "activity" as const,
        sourceLabel: "研发动态",
        title: item.title,
        description: item.summary || `${item.code} · ${item.action}`,
        time: item.createdAt,
        projectId: item.projectId,
        projectName: this.projectNameOf(projectMap, item.projectId),
        route: "/rd"
      })),
      ...announcements.map((item) => ({
        id: `announcement:${item.id}`,
        kind: "announcement" as const,
        sourceLabel: "公告",
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

    return {
      items: filtered.sort((a, b) => (b.time || "").localeCompare(a.time || "")).slice(0, limit)
    };
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
}
