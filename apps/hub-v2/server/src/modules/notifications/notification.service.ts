import type { ProfileQueryContract } from "../profile/profile.contract";
import type { RequestContext } from "../../shared/context/request-context";
import type { DomainEvent } from "../../shared/event/domain-event";
import { nowIso } from "../../shared/utils/time";
import type {
  NotificationCommandContract,
  NotificationIngestContract,
  NotificationQueryContract
} from "./notification.contract";
import { NotificationRepo } from "./notification.repo";
import type {
  NotificationCategory,
  NotificationIngestResult,
  ListNotificationsQuery,
  MarkNotificationReadsInput,
  MarkNotificationReadsResult,
  NotificationKind,
  NotificationListResult
} from "./notification.types";

type NormalizedNotification = {
  kind: NotificationKind;
  entityType: string;
  entityId: string;
  action: string;
  title: string;
  description: string;
  sourceLabel: string;
  projectId: string | null;
  route: string;
};

const DEFAULT_CHANNEL_FLAGS: Record<string, boolean> = {
  inbox: true
};

const DEFAULT_EVENT_FLAGS: Record<string, boolean> = {
  issue_todo: true,
  issue_mentioned: true,
  issue_activity: true,
  rd_todo: true,
  rd_activity: true,
  announcement_published: true,
  document_published: true,
  release_published: true,
  project_member_changed: true
};

/**
 * 通知服务
 * 
 * 负责管理通知的查询、命令和事件摄入等功能。包括：
 * - 通知列表查询和权限检查
 * - 标记通知为已读
 * - 域事件的规范化和分发
 * - 基于实体类型和操作的通知接收人推导
 * 
 * @implements {NotificationQueryContract} 通知查询契约
 * @implements {NotificationCommandContract} 通知命令契约
 * @implements {NotificationIngestContract} 通知摄入契约
 */
export class NotificationService
  implements NotificationQueryContract, NotificationCommandContract, NotificationIngestContract
{
  constructor(
    private readonly profileQuery: ProfileQueryContract,
    private readonly repo: NotificationRepo
  ) {}

  async list(query: ListNotificationsQuery, ctx: RequestContext): Promise<NotificationListResult> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      return this.emptyResult(query);
    }

    const prefs = await this.profileQuery.getNotificationPrefs(ctx);
    const channelInboxEnabled = prefs.channels?.["inbox"] !== false;
    if (!channelInboxEnabled) {
      return this.emptyResult(query);
    }

    return this.repo.list(query, userId);
  }

  async markRead(input: MarkNotificationReadsInput, ctx: RequestContext): Promise<MarkNotificationReadsResult> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      return { updated: 0, unreadCount: 0 };
    }

    const notificationIds = Array.from(
      new Set((input.notificationIds ?? []).map((item) => item.trim()).filter(Boolean))
    );
    if (notificationIds.length === 0) {
      return { updated: 0, unreadCount: this.repo.countUnread(userId) };
    }

    const updated = this.repo.markRead(userId, notificationIds, nowIso());
    return {
      updated,
      unreadCount: this.repo.countUnread(userId)
    };
  }

  // 事件摄入入口。
  // 规范化事件 -> 通知，并仅分发给相关接收人。
  async ingestDomainEvent(event: DomainEvent): Promise<NotificationIngestResult> {
    if (!this.isSupportedEntityType(event.entityType)) {
      return { delivered: [] };
    }

    const normalized = this.normalizeEvent(event);
    if (!normalized) {
      return { delivered: [] };
    }

    const userIds = this.resolveRecipientUserIds(event, normalized);
    if (userIds.length === 0) {
      return { delivered: [] };
    }
    const filteredUserIds = this.filterRecipientsByPreferences(userIds, normalized);
    if (filteredUserIds.length === 0) {
      return { delivered: [] };
    }

    const delivered = this.repo.createMany(
      filteredUserIds.map((userId) => ({
        userId,
        kind: normalized.kind,
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        action: normalized.action,
        title: normalized.title,
        description: normalized.description,
        sourceLabel: normalized.sourceLabel,
        projectId: normalized.projectId,
        route: normalized.route,
        createdAt: event.occurredAt || nowIso()
      }))
    );
    const unreadCountByUser = new Map<string, number>();
    for (const userId of new Set(delivered.map((item) => item.userId))) {
      unreadCountByUser.set(userId, this.repo.countUnread(userId));
    }

    return {
      delivered: delivered.map((item) => ({
        ...item,
        unreadCount: unreadCountByUser.get(item.userId) ?? item.unreadCount
      }))
    };
  }

  private emptyResult(query: ListNotificationsQuery): NotificationListResult {
    const page = Number.isFinite(Number(query.page)) && Number(query.page) > 0 ? Math.floor(Number(query.page)) : 1;
    const pageSize =
      Number.isFinite(Number(query.pageSize)) && Number(query.pageSize) > 0
        ? Math.floor(Number(query.pageSize))
        : Number.isFinite(Number(query.limit)) && Number(query.limit) > 0
          ? Math.floor(Number(query.limit))
          : 20;

    return {
      total: 0,
      unreadTotal: 0,
      page,
      pageSize,
      items: []
    };
  }

  private isSupportedEntityType(entityType: DomainEvent["entityType"]): boolean {
    return ["issue", "rd", "announcement", "document", "release", "project"].includes(entityType);
  }

  // 按实体/操作的接收人策略来控制通知量。
  // 优先使用直接角色接收人，而不是广泛的项目广播。
  private resolveRecipientUserIds(event: DomainEvent, normalized: NormalizedNotification): string[] {
    if (event.entityType === "issue") {
      return this.resolveIssueRecipientUserIds(event, normalized.action);
    }

    if (event.entityType === "rd") {
      return this.resolveRdRecipientUserIds(event, normalized.action);
    }

    if (event.entityType === "project") {
      const payload = event.payload ?? {};
      const actorIds = this.collectActorCandidateIds(event, payload);
      return this.excludeActorIds(
        this.collectUserIds(payload["targetUserId"], payload["affectedUserIds"], payload["userIds"]),
        actorIds
      );
    }

    if (event.entityType === "announcement" || event.entityType === "document" || event.entityType === "release") {
      if (event.scope === "project" && event.projectId) {
        return this.repo.listProjectMemberUserIds(event.projectId);
      }
      return this.repo.listAllActiveUserIds();
    }

    const affectedUserIds = this.extractAffectedUserIds(event);
    if (affectedUserIds.length > 0) {
      return affectedUserIds;
    }

    if (event.scope === "project" && event.projectId) {
      return this.repo.listProjectMemberUserIds(event.projectId);
    }

    return this.repo.listAllActiveUserIds();
  }

  private extractAffectedUserIds(event: DomainEvent): string[] {
    const payload = event.payload ?? {};
    const ids = new Set<string>();

    const pick = (value: unknown): void => {
      if (typeof value !== "string") {
        return;
      }
      const normalized = value.trim();
      if (normalized) {
        ids.add(normalized);
      }
    };

    const pickMany = (value: unknown): void => {
      if (!Array.isArray(value)) {
        return;
      }
      for (const item of value) {
        pick(item);
      }
    };

    pick(payload["assigneeId"]);
    pick(payload["reporterId"]);
    pick(payload["verifierId"]);
    pick(payload["reviewerId"]);
    pick(payload["creatorId"]);
    pick(payload["authorId"]);
    pick(payload["userId"]);
    pickMany(payload["userIds"]);
    pickMany(payload["mentionedUserIds"]);
    pickMany(payload["participantUserIds"]);
    pickMany(payload["affectedUserIds"]);

    return Array.from(ids);
  }

  private normalizeEvent(event: DomainEvent): NormalizedNotification | null {
    if (event.entityType === "issue") {
      return this.normalizeIssueEvent(event);
    }
    if (event.entityType === "rd") {
      return this.normalizeRdEvent(event);
    }
    if (event.entityType === "project") {
      return this.normalizeProjectEvent(event);
    }
    if (event.entityType === "announcement" || event.entityType === "document" || event.entityType === "release") {
      return this.normalizeContentEvent(event);
    }
    return null;
  }

  private normalizeIssueEvent(event: DomainEvent): NormalizedNotification | null {
    const payload = event.payload ?? {};
    const issueNo = this.pickString(payload["issueNo"]);
    const title = this.pickString(payload["title"]) || `测试单 ${issueNo || event.entityId}`;
    const action = this.normalizeIssueAction(event);
    if (!action) {
      return null;
    }
    const kind: NotificationKind = this.isIssueTodoAction(action) ? "todo" : "activity";

    return {
      kind,
      entityType: event.entityType,
      entityId: event.entityId,
      action,
      title,
      description: this.issueNotificationDescription(event, action, kind, issueNo),
      sourceLabel: kind === "todo" ? "测试单" : "测试单动态",
      projectId: event.projectId ?? null,
      route: `/issues?detail=${event.entityId}`
    };
  }

  private normalizeRdEvent(event: DomainEvent): NormalizedNotification | null {
    const payload = event.payload ?? {};
    const rdNo = this.pickString(payload["rdNo"]);
    const title = this.pickString(payload["title"]) || `研发项 ${rdNo || event.entityId}`;
    const kind: NotificationKind = this.isRdTodoAction(event.action) ? "todo" : "activity";
    const action = this.normalizeRdAction(event.action, kind);
    if (!action) {
      return null;
    }

    return {
      kind,
      entityType: event.entityType,
      entityId: event.entityId,
      action,
      title,
      description: `${rdNo || "研发项"} · ${this.rdActionLabel(action, kind)}`,
      sourceLabel: kind === "todo" ? "研发项" : "研发动态",
      projectId: event.projectId ?? null,
      route: `/rd?detail=${event.entityId}`
    };
  }

  private normalizeContentEvent(event: DomainEvent): NormalizedNotification | null {
    if (event.action !== "published") {
      return null;
    }

    const payload = event.payload ?? {};
    const title = this.pickString(payload["title"]) || `${this.contentEntityLabel(event.entityType)} ${event.entityId}`;

    return {
      kind: "activity",
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      title,
      description: this.contentActionLabel(event.entityType, event.action),
      sourceLabel: this.contentSourceLabel(event.entityType),
      projectId: event.projectId ?? null,
      route: "/content"
    };
  }

  private normalizeProjectEvent(event: DomainEvent): NormalizedNotification | null {
    if (!["member.added", "member.updated", "member.removed"].includes(event.action)) {
      return null;
    }
    const payload = event.payload ?? {};
    const projectName = this.pickString(payload["projectName"]) || "项目";
    const targetName = this.pickString(payload["targetDisplayName"]) || this.pickString(payload["targetUserId"]) || "成员";
    const roleCode = this.pickString(payload["roleCode"]);
    const prevRoleCode = this.pickString(payload["prevRoleCode"]);
    const actionLabel =
      event.action === "member.added"
        ? `已加入项目（角色：${this.projectRoleLabel(roleCode)}）`
        : event.action === "member.updated"
          ? `角色变更：${this.projectRoleLabel(prevRoleCode)} -> ${this.projectRoleLabel(roleCode)}`
          : "已被移出项目";

    return {
      kind: "activity",
      entityType: "project",
      entityId: event.entityId,
      action: event.action,
      title: projectName,
      description: `${targetName} · ${actionLabel}`,
      sourceLabel: "成员变更",
      projectId: event.projectId ?? null,
      route: "/projects"
    };
  }

  private isIssueTodoAction(action: string): boolean {
    return action === "assign" || action === "claim" || action === "verify.pending";
  }

  private isRdTodoAction(action: string): boolean {
    return action === "created" || action === "complete";
  }

  private issueActionLabel(action: string, kind: NotificationKind): string {
    if (kind === "todo") {
      if (action === "verify.pending") {
        return "待我验证的问题";
      }
      return "分配给我的问题";
    }

    return (
      {
        activity: "有新动态",
        created: "问题已创建",
        updated: "问题已更新",
        commented: "新增评论",
        start: "开始处理",
        resolve: "已解决",
        verify: "验证通过",
        reopen: "重新打开",
        close: "已关闭",
        "participant.added": "协作人已添加",
        "participant.removed": "协作人已移除",
        "attachment.added": "附件已添加",
        "attachment.removed": "附件已移除",
        assign: "已重新指派",
        claim: "已认领"
      }[action] || "状态已更新"
    );
  }

  // Build issue notification description with comment preview for @ mention scenario.
  private issueNotificationDescription(
    event: DomainEvent,
    action: string,
    kind: NotificationKind,
    issueNo: string
  ): string {
    if (action === "commented") {
      const payload = event.payload ?? {};
      const authorName = this.pickString(payload["authorName"]) || "有人";
      const preview = this.pickString(payload["commentPreview"]);
      if (preview) {
        return `${issueNo || "测试单"} · ${authorName}: ${preview}`;
      }
      return `${issueNo || "测试单"} · ${authorName} 提到了你`;
    }
    return `${issueNo || "测试单"} · ${this.issueActionLabel(action, kind)}`;
  }

  private rdActionLabel(action: string, kind: NotificationKind): string {
    if (kind === "todo") {
      if (action === "complete") {
        return "待我验收的研发项";
      }
      return "分配给我的研发项";
    }

    return (
      {
        activity: "有新动态",
        created: "研发项已创建",
        updated: "研发项已更新",
        start: "已开始",
        block: "已阻塞",
        resume: "已恢复",
        complete: "已完成",
        accept: "已验收",
        close: "已关闭",
        advance_stage: "阶段已推进"
      }[action] || "状态已更新"
    );
  }

  // Normalize issue actions into notification actions.
  // - resolve => verify.pending (todo for verifier flow)
  // - created/start/updated/attachment/participant changes => no inbox notification
  private normalizeIssueAction(event: DomainEvent): string | null {
    const action = event.action;

    if (
      [
        "created",
        "start",
        "updated",
        "attachment.added",
        "attachment.removed",
        "participant.added",
        "participant.removed"
      ].includes(action)
    ) {
      return null;
    }

    if (action === "resolve") {
      return "verify.pending";
    }

    if (action === "commented") {
      const payload = event.payload ?? {};
      const mentioned = this.pickManyStrings(payload["mentionedUserIds"]);
      if (mentioned.length === 0) {
        return null;
      }
      return "commented";
    }

    return action;
  }

  private normalizeRdAction(action: string, kind: NotificationKind): string | null {
    if (kind === "todo") {
      return action;
    }
    if (action === "updated") {
      return null;
    }
    return action;
  }

  // 问题接收人：
  // - assign/claim -> 被指派人
  // - resolve(verify.pending) -> 报告人 + 验证人
  // - verify/reopen -> 被指派人
  // - commented -> 仅提及的用户
  // - 其他状态转换 -> 报告人 + 被指派人 + 验证人
  // 并在可解决时始终排除操作者/自己
  private resolveIssueRecipientUserIds(event: DomainEvent, action: string): string[] {
    const payload = event.payload ?? {};
    const actorIds = this.collectActorCandidateIds(event, payload);
    if (action === "assign" || action === "claim") {
      return this.excludeActorIds(this.collectUserIds(payload["assigneeId"]), actorIds);
    }
    if (action === "verify.pending") {
      return this.excludeActorIds(
        this.collectUserIds(payload["reporterId"], payload["verifierId"]),
        actorIds
      );
    }
    if (action === "verify" || action === "reopen") {
      return this.excludeActorIds(this.collectUserIds(payload["assigneeId"]), actorIds);
    }
    if (action === "commented") {
      return this.excludeActorIds(this.collectUserIds(payload["mentionedUserIds"]), actorIds);
    }
    if (action === "close") {
      return this.excludeActorIds(
        this.collectUserIds(payload["reporterId"], payload["assigneeId"], payload["verifierId"]),
        actorIds
      );
    }
    return this.excludeActorIds(
      this.collectUserIds(payload["reporterId"], payload["assigneeId"], payload["verifierId"]),
      actorIds
    );
  }

  // RD recipients:
  // - created -> assignee
  // - complete -> reviewer
  // - key transitions -> creator + assignee + reviewer
  // and always exclude actor/self when resolvable.
  private resolveRdRecipientUserIds(event: DomainEvent, action: string): string[] {
    const payload = event.payload ?? {};
    const actorIds = this.collectActorCandidateIds(event, payload);
    if (action === "created") {
      return this.excludeActorIds(this.collectUserIds(payload["assigneeId"]), actorIds);
    }
    if (action === "complete") {
      return this.excludeActorIds(this.collectUserIds(payload["reviewerId"]), actorIds);
    }
    if (["start", "block", "resume", "accept", "close", "advance_stage"].includes(action)) {
      return this.excludeActorIds(
        this.collectUserIds(payload["creatorId"], payload["assigneeId"], payload["reviewerId"]),
        actorIds
      );
    }
    return this.excludeActorIds(
      this.collectUserIds(payload["creatorId"], payload["assigneeId"], payload["reviewerId"]),
      actorIds
    );
  }

  private collectUserIds(...values: unknown[]): string[] {
    const ids = new Set<string>();
    for (const value of values) {
      for (const id of this.pickManyStrings(value)) {
        if (id) {
          ids.add(id);
        }
      }
    }
    return Array.from(ids);
  }

  private pickManyStrings(value: unknown): string[] {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  private collectActorCandidateIds(event: DomainEvent, payload: Record<string, unknown>): string[] {
    return this.collectUserIds(event.actorId, payload["authorId"], payload["creatorId"], payload["userId"]);
  }

  private filterRecipientsByPreferences(userIds: string[], normalized: NormalizedNotification): string[] {
    const eventKey = this.mapToEventPreferenceKey(normalized);
    if (!eventKey) {
      return userIds;
    }

    const prefsByUser = this.repo.listNotificationPrefsByUserIds(userIds);
    return userIds.filter((userId) => {
      const prefs = prefsByUser.get(userId);
      const inboxEnabled =
        prefs?.channels?.["inbox"] ?? DEFAULT_CHANNEL_FLAGS["inbox"];
      if (!inboxEnabled) {
        return false;
      }
      return prefs?.events?.[eventKey] ?? DEFAULT_EVENT_FLAGS[eventKey] ?? true;
    });
  }

  private mapToEventPreferenceKey(normalized: NormalizedNotification): keyof typeof DEFAULT_EVENT_FLAGS | null {
    const category = this.toCategory(normalized);
    if (category === "issue_todo") {
      return "issue_todo";
    }
    if (category === "issue_mention") {
      return "issue_mentioned";
    }
    if (category === "issue_activity") {
      return "issue_activity";
    }
    if (category === "rd_todo") {
      return "rd_todo";
    }
    if (category === "rd_activity") {
      return "rd_activity";
    }
    if (category === "announcement") {
      return "announcement_published";
    }
    if (category === "document") {
      return "document_published";
    }
    if (category === "release") {
      return "release_published";
    }
    if (category === "project_member") {
      return "project_member_changed";
    }
    return null;
  }

  private toCategory(normalized: NormalizedNotification): NotificationCategory {
    if (normalized.entityType === "issue") {
      if (normalized.kind === "todo") {
        return "issue_todo";
      }
      return normalized.action === "commented" ? "issue_mention" : "issue_activity";
    }
    if (normalized.entityType === "rd") {
      return normalized.kind === "todo" ? "rd_todo" : "rd_activity";
    }
    if (
      normalized.entityType === "announcement" ||
      normalized.entityType === "document" ||
      normalized.entityType === "release"
    ) {
      return normalized.entityType;
    }
    if (normalized.entityType === "project") {
      return "project_member";
    }
    return "issue_activity";
  }

  private projectRoleLabel(roleCode: string): string {
    return (
      {
        project_admin: "项目管理员",
        member: "成员",
        product: "产品",
        ui: "UI",
        frontend_dev: "前端",
        backend_dev: "后端",
        qa: "测试",
        ops: "运维"
      }[roleCode] || (roleCode || "成员")
    );
  }

  private excludeActorIds(userIds: string[], actorIds: string[]): string[] {
    if (actorIds.length === 0 || userIds.length === 0) {
      return userIds;
    }
    const actorSet = new Set(actorIds);
    return userIds.filter((id) => !actorSet.has(id));
  }

  private contentSourceLabel(entityType: string): string {
    return (
      {
        announcement: "公告动态",
        document: "文档动态",
        release: "发布动态"
      }[entityType] || "内容动态"
    );
  }

  private contentEntityLabel(entityType: string): string {
    return (
      {
        announcement: "公告",
        document: "文档",
        release: "版本"
      }[entityType] || "内容"
    );
  }

  private contentActionLabel(entityType: string, action: string): string {
    if (entityType === "announcement") {
      return action === "published" ? "公告已发布" : action === "archived" ? "公告已下线" : "公告已更新";
    }
    if (entityType === "document") {
      return action === "published" ? "文档已发布" : action === "archived" ? "文档已归档" : "文档已更新";
    }
    if (entityType === "release") {
      return action === "published" ? "版本已发布" : action === "archived" ? "版本已作废" : "版本已更新";
    }
    return "内容状态已更新";
  }

  private pickString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }
}
