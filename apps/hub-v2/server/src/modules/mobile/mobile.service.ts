import type { AppConfig } from "../../shared/env/env";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { normalizePage } from "../../shared/http/pagination";
import type { AuthQueryContract } from "../auth/auth.contract";
import type { DashboardQueryContract } from "../dashboard/dashboard.contract";
import type { IssueCommentCommandContract, IssueCommentQueryContract } from "../issue/comment/issue-comment.contract";
import type { IssueCommandContract, IssueQueryContract } from "../issue/issue.contract";
import type { NotificationCommandContract, NotificationQueryContract } from "../notifications/notification.contract";
import type { ProjectQueryContract } from "../project/project.contract";
import type { RdCommandContract, RdQueryContract } from "../rd/rd.contract";
import type { AnnouncementQueryContract } from "../announcement/announcement.contract";
import type { DocumentQueryContract } from "../document/document.contract";
import type { ReleaseQueryContract } from "../release/release.contract";
import type { RequestContext } from "../../shared/context/request-context";
import type { MobileCommandContract, MobileQueryContract } from "./mobile.contract";
import {
  toMobileAnnouncementDetail,
  toMobileAnnouncementMessage,
  toMobileDocumentDetail,
  toMobileIssueDetail,
  toMobileNotificationMessage,
  toMobileProject,
  toMobileRdDetail,
  toMobileReleaseDetail,
  toMobileTodo
} from "./mobile.mapper";
import type {
  MobileBootstrap,
  MobileConnectionStatus,
  MobileDashboard,
  MobileIssueActionInput,
  MobileIssueCommentInput,
  MobileMessageDetail,
  MobileMessageItem,
  MobileMessageListResult,
  MobileMessageQuery,
  MobileMessageReadInput,
  MobileRdActionInput,
  MobileRdProgressInput,
  MobileTargetType,
  MobileTodoItem,
  MobileTodoListResult,
  MobileTodoQuery
} from "./mobile.types";

export type MobileServiceDeps = {
  config: AppConfig;
  authQuery: AuthQueryContract;
  dashboardQuery: DashboardQueryContract;
  projectQuery: ProjectQueryContract;
  issueQuery: IssueQueryContract;
  issueCommand: IssueCommandContract;
  issueCommentQuery: IssueCommentQueryContract;
  issueCommentCommand: IssueCommentCommandContract;
  rdQuery: RdQueryContract;
  rdCommand: RdCommandContract;
  notificationQuery: NotificationQueryContract;
  notificationCommand: NotificationCommandContract;
  announcementQuery: AnnouncementQueryContract;
  documentQuery: DocumentQueryContract;
  releaseQuery: ReleaseQueryContract;
};

export class MobileService implements MobileQueryContract, MobileCommandContract {
  constructor(private readonly deps: MobileServiceDeps) {}

  async getBootstrap(ctx: RequestContext): Promise<MobileBootstrap> {
    const [profile, projectsResult, notifications] = await Promise.all([
      this.deps.authQuery.me(ctx),
      this.deps.projectQuery.listAccessible({ page: 1, pageSize: 100, status: "active", scope: "all_accessible" }, ctx),
      this.deps.notificationQuery.list({ page: 1, pageSize: 1 }, ctx)
    ]);
    const projects = projectsResult.items.map(toMobileProject);

    return {
      profile,
      projects,
      currentProject: projects[0] ?? null,
      unreadCount: notifications.unreadTotal,
      capabilities: {
        canUseIssue: projects.length > 0,
        canUseRd: projects.length > 0,
        canUseMessages: true,
        canUseDocuments: projects.length > 0
      },
      defaultFilters: {
        todoCategories: ["all", "issue", "rd", "verify"],
        messageCategories: ["all", "issue", "rd", "announcement", "document", "release"]
      }
    };
  }

  async getDashboard(ctx: RequestContext): Promise<MobileDashboard> {
    const [home, notifications] = await Promise.all([
      this.deps.dashboardQuery.getHomeData(ctx),
      this.deps.notificationQuery.list({ page: 1, pageSize: 1 }, ctx)
    ]);
    const todos = home.todos.map(toMobileTodo);

    return {
      stats: {
        todoTotal: home.stats.assignedIssues + home.stats.assignedRdItems,
        verifyTotal: home.stats.verifyingIssues,
        assignedIssues: home.stats.assignedIssues,
        assignedRdItems: home.stats.assignedRdItems,
        inProgressRdItems: home.stats.inProgressRdItems,
        unreadMessages: notifications.unreadTotal
      },
      todos,
      rdProgress: todos.filter((item) => item.targetType === "rd"),
      announcements: home.announcements.map(toMobileAnnouncementMessage),
      quickActions: [
        { key: "todos", label: "待办", target: "/todos", badgeCount: todos.length },
        { key: "messages", label: "消息", target: "/messages", badgeCount: notifications.unreadTotal },
        { key: "profile", label: "我的", target: "/profile" }
      ]
    };
  }

  async listTodos(query: MobileTodoQuery, ctx: RequestContext): Promise<MobileTodoListResult> {
    const base = await this.deps.dashboardQuery.getTodosPage({
      page: 1,
      pageSize: 100,
      projectId: query.projectId
    }, ctx);
    const filtered = base.items.map(toMobileTodo).filter((item) => this.matchTodo(item, query));
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);

    return {
      items: filtered.slice(offset, offset + pageSize),
      page,
      pageSize,
      total: filtered.length
    };
  }

  async getTodoDetail(targetType: MobileTargetType, targetId: string, ctx: RequestContext) {
    if (targetType === "issue") {
      const [issue, comments, logs] = await Promise.all([
        this.deps.issueQuery.getById(targetId, ctx),
        this.deps.issueCommentQuery.list(targetId, ctx),
        this.deps.issueQuery.listLogs(targetId, ctx)
      ]);
      return toMobileIssueDetail(issue, comments, logs);
    }

    const [item, logs, progresses, stageTasks] = await Promise.all([
      this.deps.rdQuery.getItemById(targetId, ctx),
      this.deps.rdQuery.listLogs(targetId, ctx),
      this.deps.rdQuery.listProgress(targetId, ctx),
      this.deps.rdQuery.listStageTasks(targetId, ctx)
    ]);
    return toMobileRdDetail(item, logs, progresses, stageTasks);
  }

  async createIssueComment(issueId: string, input: MobileIssueCommentInput, ctx: RequestContext) {
    return this.deps.issueCommentCommand.create(issueId, input, ctx);
  }

  async runIssueAction(issueId: string, input: MobileIssueActionInput, ctx: RequestContext) {
    switch (input.action) {
      case "start": return this.deps.issueCommand.start(issueId, ctx);
      case "wait_update": return this.deps.issueCommand.waitUpdate(issueId, ctx);
      case "resolve": return this.deps.issueCommand.resolve(issueId, { resolutionSummary: input.note }, ctx);
      case "verify": return this.deps.issueCommand.verify(issueId, ctx);
      case "reopen": return this.deps.issueCommand.reopen(issueId, { remark: input.note }, ctx);
      case "close": return this.deps.issueCommand.close(issueId, { reason: input.reason, remark: input.note }, ctx);
    }
  }

  async updateRdProgress(itemId: string, input: MobileRdProgressInput, ctx: RequestContext) {
    return this.deps.rdCommand.updateProgress(itemId, input, ctx);
  }

  async runRdAction(itemId: string, input: MobileRdActionInput, ctx: RequestContext) {
    switch (input.action) {
      case "start": return this.deps.rdCommand.start(itemId, ctx);
      case "block": return this.deps.rdCommand.block(itemId, { blockerReason: input.reason ?? input.note }, ctx);
      case "resume": return this.deps.rdCommand.resume(itemId, ctx);
      case "complete": return this.deps.rdCommand.complete(itemId, ctx, { reason: input.reason ?? input.note });
      case "accept": return this.deps.rdCommand.accept(itemId, ctx);
      case "reopen": return this.deps.rdCommand.reopen(itemId, ctx);
      case "close": return this.deps.rdCommand.close(itemId, { reason: input.reason ?? input.note }, ctx);
    }
  }

  async listMessages(query: MobileMessageQuery, ctx: RequestContext): Promise<MobileMessageListResult> {
    const source = await this.deps.notificationQuery.list({
      page: 1,
      pageSize: 100,
      unreadOnly: query.unreadOnly
    }, ctx);
    const filtered = source.items.map(toMobileNotificationMessage).filter((item) => this.matchMessage(item, query));
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);

    return {
      items: filtered.slice(offset, offset + pageSize),
      page,
      pageSize,
      total: filtered.length,
      unreadTotal: source.unreadTotal
    };
  }

  async getMessageDetail(messageType: string, id: string, ctx: RequestContext): Promise<MobileMessageDetail> {
    if (messageType === "announcement") return toMobileAnnouncementDetail(await this.deps.announcementQuery.getById(id, ctx));
    if (messageType === "document") return toMobileDocumentDetail(await this.deps.documentQuery.getById(id, ctx));
    if (messageType === "release") return toMobileReleaseDetail(await this.deps.releaseQuery.getById(id, ctx));
    if (messageType === "notification") return this.getNotificationDetail(id, ctx);
    throw new AppError(ERROR_CODES.BAD_REQUEST, `unsupported message type: ${messageType}`, 400);
  }

  async markMessagesRead(input: MobileMessageReadInput, ctx: RequestContext) {
    return this.deps.notificationCommand.markRead(input, ctx);
  }

  async getConnection(ctx: RequestContext): Promise<MobileConnectionStatus> {
    const bootstrap = await this.getBootstrap(ctx);
    return {
      app: "hub-v2",
      env: this.deps.config.nodeEnv,
      authenticated: true,
      profile: bootstrap.profile,
      projectCount: bootstrap.projects.length,
      currentProject: bootstrap.currentProject
    };
  }

  private matchTodo(item: MobileTodoItem, query: MobileTodoQuery): boolean {
    if (query.category === "issue" && item.targetType !== "issue") return false;
    if (query.category === "rd" && item.targetType !== "rd") return false;
    if (query.category === "verify" && !item.summary?.includes("verify")) return false;
    if (query.status?.trim() && item.status !== query.status.trim()) return false;
    if (query.priority?.trim() && item.priority !== query.priority.trim()) return false;
    const keyword = query.keyword?.trim().toLowerCase();
    return !keyword || `${item.code} ${item.title}`.toLowerCase().includes(keyword);
  }

  private matchMessage(item: MobileMessageItem, query: MobileMessageQuery): boolean {
    return !query.category || query.category === "all" || item.category === query.category;
  }

  private async getNotificationDetail(id: string, ctx: RequestContext): Promise<MobileMessageDetail> {
    const source = await this.deps.notificationQuery.list({ page: 1, pageSize: 100 }, ctx);
    const item = source.items.find((candidate) => candidate.id === id);
    if (!item) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `notification not found: ${id}`, 404);
    }

    return {
      id: item.id,
      messageType: "notification",
      title: item.title,
      markdown: item.description,
      projectId: item.projectId,
      publishedAt: item.time,
      unread: item.unread
    };
  }
}
