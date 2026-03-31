import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import type { EventBus } from "../../shared/event/event-bus";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ContentLogCommandContract } from "../content-log/content-log.contract";
import type { ProjectAccessContract } from "../project/project-access.contract";
import { requireAdmin } from "../utils/require-admin";
import type { AnnouncementCommandContract, AnnouncementQueryContract } from "./announcement.contract";
import { AnnouncementRepo } from "./announcement.repo";
import type {
  AnnouncementEntity,
  AnnouncementListResult,
  CreateAnnouncementInput,
  ListAnnouncementsQuery,
  UpdateAnnouncementInput
} from "./announcement.types";

export class AnnouncementService implements AnnouncementCommandContract, AnnouncementQueryContract {
  constructor(
    private readonly repo: AnnouncementRepo,
    private readonly projectAccess: ProjectAccessContract,
    private readonly eventBus: EventBus,
    private readonly contentLogCommand: ContentLogCommandContract
  ) {}

  async create(input: CreateAnnouncementInput, ctx: RequestContext): Promise<AnnouncementEntity> {
    const projectId = input.projectId?.trim() || null;
    await this.requireProjectOrAdmin(projectId, ctx, "create announcement");

    const now = nowIso();
    const entity: AnnouncementEntity = {
      id: genId("ann"),
      projectId,
      title: input.title.trim(),
      summary: input.summary?.trim() || null,
      contentMd: input.contentMd,
      scope: input.scope ?? (projectId ? "project" : "global"),
      pinned: input.pinned === true,
      status: "draft",
      publishAt: null,
      expireAt: input.expireAt?.trim() || null,
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

    const nextProjectId =
      input.projectId === undefined ? current.projectId : input.projectId?.trim() || null;
    await this.requireProjectOrAdmin(nextProjectId, ctx, "update announcement");

    const updated = this.repo.update(id, {
      projectId: nextProjectId,
      title: input.title?.trim() || current.title,
      summary: input.summary === undefined ? current.summary : input.summary?.trim() || null,
      contentMd: input.contentMd ?? current.contentMd,
      scope: input.scope ?? current.scope,
      pinned: input.pinned ?? current.pinned,
      expireAt: input.expireAt === undefined ? current.expireAt : input.expireAt?.trim() || null,
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
    await this.requireProjectOrAdmin(current.projectId, ctx, "publish announcement");

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
    const projectId = query.projectId?.trim();
    if (projectId) {
      await this.projectAccess.requireProjectAccess(projectId, ctx, "list announcements");
    } else {
      requireAdmin(ctx);
    }
    return this.repo.list(query);
  }

  async getById(id: string, ctx: RequestContext): Promise<AnnouncementEntity> {
    const entity = this.requireById(id);
    await this.requireProjectOrAdmin(entity.projectId, ctx, "get announcement");
    return entity;
  }

  async archive(id: string, ctx: RequestContext): Promise<AnnouncementEntity> {
    const current = this.requireById(id);
    await this.requireProjectOrAdmin(current.projectId, ctx, "archive announcement");

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
    return this.repo.listPublic(projectIds, query);
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
      return;
    }
    requireAdmin(ctx);
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
      metaJson: JSON.stringify({ status: entity.status, scope: entity.scope }),
      createdAt: nowIso()
    });
  }
}
