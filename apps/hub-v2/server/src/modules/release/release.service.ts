import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import type { EventBus } from "../../shared/event/event-bus";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
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
    private readonly eventBus: EventBus
  ) {}

  async create(input: CreateReleaseInput, ctx: RequestContext): Promise<ReleaseEntity> {
    requireAdmin(ctx);
    if (input.projectId?.trim()) {
      await this.projectAccess.requireProjectAccess(input.projectId.trim(), ctx, "create release");
    }

    const now = nowIso();
    const entity: ReleaseEntity = {
      id: genId("rel"),
      projectId: input.projectId?.trim() || null,
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
    return entity;
  }

  async update(id: string, input: UpdateReleaseInput, ctx: RequestContext): Promise<ReleaseEntity> {
    requireAdmin(ctx);
    const current = this.requireById(id);
    const nextProjectId =
      input.projectId === undefined ? current.projectId : input.projectId?.trim() || null;

    if (nextProjectId) {
      await this.projectAccess.requireProjectAccess(nextProjectId, ctx, "update release");
    }

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
      throw new AppError("RELEASE_UPDATE_FAILED", "failed to update release", 500);
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

    return entity;
  }

  async publish(id: string, ctx: RequestContext): Promise<ReleaseEntity> {
    requireAdmin(ctx);
    const current = this.requireById(id);
    if (current.projectId) {
      await this.projectAccess.requireProjectAccess(current.projectId, ctx, "publish release");
    }

    const publishedAt = nowIso();
    const updated = this.repo.update(id, {
      status: "published",
      publishedAt,
      updatedAt: publishedAt
    });

    if (!updated) {
      throw new AppError("RELEASE_PUBLISH_FAILED", "failed to publish release", 500);
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

    return entity;
  }

  async list(query: ListReleasesQuery, ctx: RequestContext): Promise<ReleaseListResult> {
    requireAdmin(ctx);
    return this.repo.list(query);
  }

  async getById(id: string, ctx: RequestContext): Promise<ReleaseEntity> {
    requireAdmin(ctx);
    const entity = this.requireById(id);
    if (entity.projectId) {
      await this.projectAccess.requireProjectAccess(entity.projectId, ctx, "get release");
    }
    return entity;
  }

  async listPublic(query: ListReleasesQuery, _ctx: RequestContext): Promise<ReleaseListResult> {
    return this.repo.listPublic(query);
  }

  private requireById(id: string): ReleaseEntity {
    const entity = this.repo.findById(id);
    if (!entity) {
      throw new AppError("RELEASE_NOT_FOUND", `release not found: ${id}`, 404);
    }
    return entity;
  }
}
