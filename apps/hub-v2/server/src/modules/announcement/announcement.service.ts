import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import type { EventBus } from "../../shared/event/event-bus";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ContentLogCommandContract } from "../content-log/content-log.contract";
import type { ProjectAccessContract } from "../project/project-access.contract";
import { requirePermission } from "../utils/require-permission";
import type { AnnouncementCommandContract, AnnouncementQueryContract } from "./announcement.contract";
import { AnnouncementRepo } from "./announcement.repo";
import type {
  AnnouncementDomain,
  AnnouncementEntity,
  AnnouncementListResult,
  CreateAnnouncementInput,
  ListAnnouncementsQuery,
  UpdateAnnouncementInput
} from "./announcement.types";

type NormalizedAnnouncementInput = {
  projectId: string | null;
  domain: AnnouncementDomain;
  title: string;
  summary: string | null;
  contentMd: string;
  scope: "global" | "project";
  pinned: boolean;
  effectiveAt: string | null;
  notifyRelatedUsers: boolean;
  expireAt: string | null;
};

export class AnnouncementService implements AnnouncementCommandContract, AnnouncementQueryContract {
  private static readonly GLOBAL_MANAGE_PERMISSION = "announcement.global.manage";
  private static readonly REIMBURSEMENT_MANAGE_PERMISSION = "expense.rule.manage";

  constructor(
    private readonly repo: AnnouncementRepo,
    private readonly projectAccess: ProjectAccessContract,
    private readonly eventBus: EventBus,
    private readonly contentLogCommand: ContentLogCommandContract
  ) {}

  async create(input: CreateAnnouncementInput, ctx: RequestContext): Promise<AnnouncementEntity> {
    const normalized = this.normalizeDraftInput(input);
    const projectId = normalized.projectId;
    await this.requireAnnouncementManage(normalized.domain, projectId, ctx, "create announcement");

    const now = nowIso();
    const entity: AnnouncementEntity = {
      id: genId("ann"),
      projectId,
      domain: normalized.domain,
      title: normalized.title,
      summary: normalized.summary,
      contentMd: normalized.contentMd,
      scope: normalized.scope,
      pinned: normalized.pinned,
      effectiveAt: normalized.effectiveAt,
      notifyRelatedUsers: normalized.notifyRelatedUsers,
      status: "draft",
      publishAt: null,
      expireAt: normalized.expireAt,
      createdBy: ctx.accountId,
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
    this.recordContentLog("created", entity, ctx, "创建公告");
    return entity;
  }

  async update(id: string, input: UpdateAnnouncementInput, ctx: RequestContext): Promise<AnnouncementEntity> {
    const current = this.repo.findById(id);
    if (!current) {
      throw new AppError(ERROR_CODES.ANNOUNCEMENT_NOT_FOUND, `announcement not found: ${id}`, 404);
    }

    const normalized = this.normalizeDraftInput(
      {
        projectId: input.projectId === undefined ? current.projectId : input.projectId,
        domain: input.domain ?? current.domain,
        title: input.title ?? current.title,
        summary: input.summary === undefined ? current.summary ?? "" : input.summary,
        contentMd: input.contentMd ?? current.contentMd,
        scope: input.scope ?? current.scope,
        pinned: input.pinned ?? current.pinned,
        effectiveAt: input.effectiveAt === undefined ? current.effectiveAt ?? "" : input.effectiveAt ?? "",
        notifyRelatedUsers: input.notifyRelatedUsers ?? current.notifyRelatedUsers,
        expireAt: input.expireAt === undefined ? current.expireAt ?? "" : input.expireAt ?? ""
      },
      current.domain
    );
    const nextProjectId = normalized.projectId;
    await this.requireAnnouncementManage(normalized.domain, nextProjectId, ctx, "update announcement");

    const updated = this.repo.update(id, {
      projectId: nextProjectId,
      domain: normalized.domain,
      title: normalized.title,
      summary: normalized.summary,
      contentMd: normalized.contentMd,
      scope: normalized.scope,
      pinned: normalized.pinned,
      effectiveAt: normalized.effectiveAt,
      notifyRelatedUsers: normalized.notifyRelatedUsers,
      expireAt: normalized.expireAt,
      updatedAt: nowIso()
    });

    if (!updated) {
      throw new AppError(ERROR_CODES.ANNOUNCEMENT_UPDATE_FAILED, "failed to update announcement", 500);
    }

    const entity = this.requireById(id);
    await this.eventBus.emit({
      type: "announcement.updated",
      scope: entity.projectId ? "project" : "global",
      projectId: entity.projectId ?? undefined,
      entityType: "announcement",
      entityId: entity.id,
      action: "updated",
      actorId: ctx.accountId,
      occurredAt: entity.updatedAt,
      payload: {
        title: entity.title,
        status: entity.status
      }
    });
    this.recordContentLog("updated", entity, ctx, "更新公告");
    return entity;
  }

  async publish(id: string, ctx: RequestContext): Promise<AnnouncementEntity> {
    const current = this.requireById(id);
    await this.requireAnnouncementManage(current.domain, current.projectId, ctx, "publish announcement");

    const publishAt = nowIso();
    const updated = this.repo.update(id, {
      status: "published",
      publishAt,
      updatedAt: publishAt
    });

    if (!updated) {
      throw new AppError(ERROR_CODES.ANNOUNCEMENT_PUBLISH_FAILED, "failed to publish announcement", 500);
    }

    const entity = this.requireById(id);
    await this.eventBus.emit({
      type: "announcement.published",
      scope: entity.projectId ? "project" : "global",
      projectId: entity.projectId ?? undefined,
      entityType: "announcement",
      entityId: entity.id,
      action: "published",
      actorId: ctx.accountId,
      occurredAt: entity.publishAt || entity.updatedAt,
      payload: {
        title: entity.title
      }
    });
    this.recordContentLog("published", entity, ctx, "发布公告");
    return entity;
  }

  async list(query: ListAnnouncementsQuery, ctx: RequestContext): Promise<AnnouncementListResult> {
    if (query.domain === "reimbursement" && query.projectId?.trim()) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "reimbursement announcements do not support project scope", 400);
    }
    if (query.domain === "reimbursement") {
      this.requireListReimbursementAnnouncements(query, ctx);
      return this.repo.list({ ...query, projectId: undefined });
    }
    const projectId = query.projectId?.trim();
    if (projectId) {
      await this.projectAccess.requireProjectAccess(projectId, ctx, "list announcements");
      return this.repo.list({ ...query, domain: query.domain ?? "content", scope: query.scope ?? "project" });
    }
    this.requireGlobalManagePermission(ctx);
    return this.repo.list({ ...query, domain: query.domain ?? "content", scope: "global", projectId: undefined });
  }

  async getById(id: string, ctx: RequestContext): Promise<AnnouncementEntity> {
    const entity = this.requireById(id);
    await this.requireReadableAnnouncement(entity, ctx, "get announcement");
    return entity;
  }

  async archive(id: string, ctx: RequestContext): Promise<AnnouncementEntity> {
    const current = this.requireById(id);
    await this.requireAnnouncementManage(current.domain, current.projectId, ctx, "archive announcement");

    if (current.status === "archived") {
      return current;
    }

    const updatedAt = nowIso();
    const updated = this.repo.update(id, {
      status: "archived",
      updatedAt
    });

    if (!updated) {
      throw new AppError(ERROR_CODES.ANNOUNCEMENT_ARCHIVE_FAILED, "failed to archive announcement", 500);
    }

    const entity = this.requireById(id);
    await this.eventBus.emit({
      type: "announcement.archived",
      scope: entity.projectId ? "project" : "global",
      projectId: entity.projectId ?? undefined,
      entityType: "announcement",
      entityId: entity.id,
      action: "archived",
      actorId: ctx.accountId,
      occurredAt: entity.updatedAt,
      payload: {
        title: entity.title,
        status: entity.status
      }
    });
    this.recordContentLog("archived", entity, ctx, "下线公告");
    return entity;
  }

  async listPublic(query: ListAnnouncementsQuery, ctx: RequestContext): Promise<AnnouncementListResult> {
    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    return this.repo.listPublic(projectIds, { ...query, domain: "content" });
  }

  async getPublicById(id: string): Promise<AnnouncementEntity> {
    const entity = this.requireById(id);
    if (entity.domain !== "reimbursement" || entity.status !== "published") {
      throw new AppError(ERROR_CODES.ANNOUNCEMENT_NOT_FOUND, `announcement not found: ${id}`, 404);
    }
    return entity;
  }

  async listRecentForDashboard(projectIds: string[], limit: number, _ctx: RequestContext): Promise<AnnouncementEntity[]> {
    return this.repo.listRecentForDashboard(projectIds, limit);
  }

  async listRecentArchivedForNotifications(
    projectIds: string[],
    limit: number,
    _ctx: RequestContext
  ): Promise<AnnouncementEntity[]> {
    return this.repo.listRecentArchivedForNotifications(projectIds, limit);
  }

  async getReadVersions(ids: string[], ctx: RequestContext): Promise<Map<string, string>> {
    if (!ctx.userId || ids.length === 0) {
      return new Map();
    }
    return this.repo.getReadVersionsByUser(ctx.userId, ids);
  }

  async markReadBatch(ids: string[], ctx: RequestContext): Promise<number> {
    if (!ctx.userId || ids.length === 0) {
      return 0;
    }

    const uniqueIds = Array.from(new Set(ids.map((item) => item.trim()).filter(Boolean)));
    if (uniqueIds.length === 0) {
      return 0;
    }

    const accessibleProjectIds = new Set(await this.projectAccess.listAccessibleProjectIds(ctx));
    const now = nowIso();
    let updated = 0;
    for (const id of uniqueIds) {
      const entity = this.repo.findById(id);
      if (!entity || entity.status !== "published") {
        continue;
      }
      if (entity.projectId && !ctx.roles.includes("admin") && !accessibleProjectIds.has(entity.projectId)) {
        continue;
      }
      this.repo.markRead(entity.id, ctx.userId, entity.updatedAt, now, genId("anr"));
      updated += 1;
    }
    return updated;
  }

  private requireById(id: string): AnnouncementEntity {
    const entity = this.repo.findById(id);
    if (!entity) {
      throw new AppError(ERROR_CODES.ANNOUNCEMENT_NOT_FOUND, `announcement not found: ${id}`, 404);
    }
    return entity;
  }

  private async requireProjectOrAdmin(projectId: string | null, ctx: RequestContext, action: string): Promise<void> {
    if (projectId) {
      await this.projectAccess.requireProjectAccess(projectId, ctx, action);
      const actorId = this.resolveActorId(ctx);
      if (!actorId) {
        throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
      }
      const member = await this.projectAccess.requireProjectMember(projectId, actorId, `${action} role check`);
      if (member.isOwner || member.roleCode === "project_admin") {
        return;
      }
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden: project admin only`, 403);
    }
    this.requireGlobalManagePermission(ctx);
  }

  private async requireAnnouncementManage(
    domain: AnnouncementDomain,
    projectId: string | null,
    ctx: RequestContext,
    action: string
  ): Promise<void> {
    if (domain === "reimbursement") {
      this.requireReimbursementManagePermission(ctx);
      return;
    }
    await this.requireProjectOrAdmin(projectId, ctx, action);
  }

  private requireGlobalManagePermission(ctx: RequestContext): void {
    requirePermission(ctx, AnnouncementService.GLOBAL_MANAGE_PERMISSION);
  }

  private requireReimbursementManagePermission(ctx: RequestContext): void {
    requirePermission(ctx, AnnouncementService.REIMBURSEMENT_MANAGE_PERMISSION);
  }

  private async requireReadableAnnouncement(entity: AnnouncementEntity, ctx: RequestContext, action: string): Promise<void> {
    if (entity.domain === "reimbursement") {
      if (entity.status === "published") {
        return;
      }
      this.requireReimbursementManagePermission(ctx);
      return;
    }

    if (entity.status !== "published") {
      await this.requireProjectOrAdmin(entity.projectId, ctx, action);
      return;
    }

    if (entity.projectId) {
      await this.projectAccess.requireProjectAccess(entity.projectId, ctx, action);
      return;
    }
  }

  private requireListReimbursementAnnouncements(query: ListAnnouncementsQuery, ctx: RequestContext): void {
    if (query.status === "published") {
      return;
    }
    this.requireReimbursementManagePermission(ctx);
  }

  private resolveActorId(ctx: RequestContext): string | null {
    const userId = ctx.userId?.trim();
    if (userId) {
      return userId;
    }
    const accountId = ctx.accountId?.trim();
    if (accountId) {
      return accountId;
    }
    return null;
  }

  private recordContentLog(
    actionType: "created" | "updated" | "published" | "archived",
    entity: AnnouncementEntity,
    ctx: RequestContext,
    summary: string
  ): void {
    this.contentLogCommand.create({
      id: genId("clog"),
      projectId: entity.projectId,
      contentType: "announcement",
      contentId: entity.id,
      actionType,
      title: entity.title,
      summary,
      operatorId: ctx.userId ?? null,
      operatorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      metaJson: JSON.stringify({ status: entity.status, scope: entity.scope, domain: entity.domain }),
      createdAt: nowIso()
    });
  }

  private normalizeDraftInput(
    input: CreateAnnouncementInput,
    fallbackDomain: AnnouncementDomain = "content"
  ): NormalizedAnnouncementInput {
    const domain = input.domain ?? fallbackDomain;
    const isReimbursement = domain === "reimbursement";
    const projectId = isReimbursement ? null : input.projectId?.trim() || null;
    const scope = isReimbursement ? "global" : input.scope ?? (projectId ? "project" : "global");

    if (!isReimbursement) {
      if (scope === "project" && !projectId) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "project announcements require projectId", 400);
      }
      if (scope === "global" && projectId) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "global announcements must not include projectId", 400);
      }
    }

    return {
      ...input,
      projectId,
      domain,
      title: input.title.trim(),
      summary: input.summary?.trim() || null,
      contentMd: input.contentMd,
      scope,
      pinned: input.pinned === true,
      effectiveAt: isReimbursement ? input.effectiveAt?.trim() || null : null,
      notifyRelatedUsers: isReimbursement ? input.notifyRelatedUsers === true : false,
      expireAt: input.expireAt?.trim() || null
    };
  }
}
