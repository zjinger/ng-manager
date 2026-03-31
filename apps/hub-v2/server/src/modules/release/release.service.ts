import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import type { EventBus } from "../../shared/event/event-bus";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ContentLogCommandContract } from "../content-log/content-log.contract";
import type { ProjectAccessContract } from "../project/project-access.contract";
import { requireAdmin } from "../utils/require-admin";
import type { ReleaseCommandContract, ReleaseQueryContract } from "./release.contract";
import { ReleaseRepo } from "./release.repo";
import type {
  CreateReleaseInput,
  ListReleasesQuery,
  ReleaseEntity,
  ReleaseListResult,
  UpdateReleaseInput
} from "./release.types";

export class ReleaseService implements ReleaseCommandContract, ReleaseQueryContract {
  constructor(
    private readonly repo: ReleaseRepo,
    private readonly projectAccess: ProjectAccessContract,
    private readonly eventBus: EventBus,
    private readonly contentLogCommand: ContentLogCommandContract
  ) {}

  async create(input: CreateReleaseInput, ctx: RequestContext): Promise<ReleaseEntity> {
    const projectId = input.projectId?.trim() || null;
    await this.requireProjectOrAdmin(projectId, ctx, "create release");

    const now = nowIso();
    const entity: ReleaseEntity = {
      id: genId("rel"),
      projectId,
      channel: input.channel.trim(),
      version: input.version.trim(),
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      downloadUrl: input.downloadUrl?.trim() || null,
      status: "draft",
      publishedAt: null,
      createdBy: ctx.accountId,
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
    this.recordContentLog("created", entity, ctx, "创建版本发布");
    return entity;
  }

  async update(id: string, input: UpdateReleaseInput, ctx: RequestContext): Promise<ReleaseEntity> {
    const current = this.requireById(id);
    const nextProjectId =
      input.projectId === undefined ? current.projectId : input.projectId?.trim() || null;

    await this.requireProjectOrAdmin(nextProjectId, ctx, "update release");

    const updated = this.repo.update(id, {
      projectId: nextProjectId,
      channel: input.channel?.trim() || current.channel,
      version: input.version?.trim() || current.version,
      title: input.title?.trim() || current.title,
      notes: input.notes === undefined ? current.notes : input.notes?.trim() || null,
      downloadUrl:
        input.downloadUrl === undefined ? current.downloadUrl : input.downloadUrl?.trim() || null,
      updatedAt: nowIso()
    });

    if (!updated) {
      throw new AppError(ERROR_CODES.RELEASE_UPDATE_FAILED, "failed to update release", 500);
    }

    const entity = this.requireById(id);
    await this.eventBus.emit({
      type: "release.updated",
      scope: entity.projectId ? "project" : "global",
      projectId: entity.projectId ?? undefined,
      entityType: "release",
      entityId: entity.id,
      action: "updated",
      actorId: ctx.accountId,
      occurredAt: entity.updatedAt,
      payload: {
        title: entity.title,
        version: entity.version,
        channel: entity.channel,
        status: entity.status
      }
    });
    this.recordContentLog("updated", entity, ctx, "更新版本发布");

    return entity;
  }

  async publish(id: string, ctx: RequestContext): Promise<ReleaseEntity> {
    const current = this.requireById(id);
    await this.requireProjectOrAdmin(current.projectId, ctx, "publish release");

    const publishedAt = nowIso();
    const updated = this.repo.update(id, {
      status: "published",
      publishedAt,
      updatedAt: publishedAt
    });

    if (!updated) {
      throw new AppError(ERROR_CODES.RELEASE_PUBLISH_FAILED, "failed to publish release", 500);
    }

    const entity = this.requireById(id);
    await this.eventBus.emit({
      type: "release.published",
      scope: entity.projectId ? "project" : "global",
      projectId: entity.projectId ?? undefined,
      entityType: "release",
      entityId: entity.id,
      action: "published",
      actorId: ctx.accountId,
      occurredAt: entity.publishedAt || entity.updatedAt,
      payload: {
        title: entity.title,
        version: entity.version,
        channel: entity.channel
      }
    });
    this.recordContentLog("published", entity, ctx, "发布版本");

    return entity;
  }

  async archive(id: string, ctx: RequestContext): Promise<ReleaseEntity> {
    const current = this.requireById(id);
    await this.requireProjectOrAdmin(current.projectId, ctx, "archive release");
    if (current.status === "archived") {
      return current;
    }

    const updatedAt = nowIso();
    const updated = this.repo.update(id, {
      status: "archived",
      updatedAt
    });

    if (!updated) {
      throw new AppError(ERROR_CODES.RELEASE_ARCHIVE_FAILED, "failed to archive release", 500);
    }

    const entity = this.requireById(id);
    await this.eventBus.emit({
      type: "release.archived",
      scope: entity.projectId ? "project" : "global",
      projectId: entity.projectId ?? undefined,
      entityType: "release",
      entityId: entity.id,
      action: "archived",
      actorId: ctx.accountId,
      occurredAt: entity.updatedAt,
      payload: {
        title: entity.title,
        version: entity.version,
        channel: entity.channel,
        status: entity.status
      }
    });
    this.recordContentLog("archived", entity, ctx, "作废版本");

    return entity;
  }

  async list(query: ListReleasesQuery, ctx: RequestContext): Promise<ReleaseListResult> {
    const projectId = query.projectId?.trim();
    if (projectId) {
      await this.projectAccess.requireProjectAccess(projectId, ctx, "list releases");
    } else {
      requireAdmin(ctx);
    }
    return this.repo.list(query);
  }

  async getById(id: string, ctx: RequestContext): Promise<ReleaseEntity> {
    const entity = this.requireById(id);
    await this.requireProjectOrAdmin(entity.projectId, ctx, "get release");
    return entity;
  }

  async listPublic(query: ListReleasesQuery, _ctx: RequestContext): Promise<ReleaseListResult> {
    return this.repo.listPublic(query);
  }

  async listRecentPublishedForNotifications(
    projectIds: string[],
    limit: number,
    _ctx: RequestContext
  ): Promise<ReleaseEntity[]> {
    return this.repo.listRecentPublishedForNotifications(projectIds, limit);
  }

  async listRecentArchivedForNotifications(
    projectIds: string[],
    limit: number,
    _ctx: RequestContext
  ): Promise<ReleaseEntity[]> {
    return this.repo.listRecentArchivedForNotifications(projectIds, limit);
  }

  private requireById(id: string): ReleaseEntity {
    const entity = this.repo.findById(id);
    if (!entity) {
      throw new AppError(ERROR_CODES.RELEASE_NOT_FOUND, `release not found: ${id}`, 404);
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
    entity: ReleaseEntity,
    ctx: RequestContext,
    summary: string
  ): void {
    this.contentLogCommand.create({
      id: genId("clog"),
      projectId: entity.projectId,
      contentType: "release",
      contentId: entity.id,
      actionType,
      title: entity.title,
      summary,
      operatorId: ctx.userId ?? null,
      operatorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      metaJson: JSON.stringify({ status: entity.status, version: entity.version, channel: entity.channel }),
      createdAt: nowIso()
    });
  }
}

