import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import { ProjectRepo } from "../project/project.repo";
import { HubWsEvents } from "../ws/ws.events";
import type {
  CreateReleaseInput,
  ListReleaseQuery,
  ReleaseEntity,
  ReleaseListResult,
  UpdateReleaseInput
} from "./release.types";
import { ReleaseRepo } from "./release.repo";

export class ReleaseService {
  constructor(
    private readonly repo: ReleaseRepo,
    private readonly projectRepo: ProjectRepo,
    private readonly wsEvents: HubWsEvents
  ) {}

  create(input: CreateReleaseInput): ReleaseEntity {
    this.assertProjectExists(input.projectId);

    const now = nowIso();
    const entity: ReleaseEntity = {
      id: genId("rel"),
      projectId: input.projectId ?? null,
      channel: input.channel,
      version: input.version.trim(),
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      downloadUrl: input.downloadUrl?.trim() || null,
      status: "draft",
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
    return entity;
  }

  getById(id: string): ReleaseEntity {
    const item = this.repo.findById(id);
    if (!item) {
      throw new AppError("RELEASE_NOT_FOUND", `release not found: ${id}`, 404);
    }
    return item;
  }

  list(query: ListReleaseQuery): ReleaseListResult {
    if (query.projectId) {
      this.assertProjectExists(query.projectId);
    }

    return this.repo.list(query);
  }

  update(id: string, input: UpdateReleaseInput): ReleaseEntity {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("RELEASE_NOT_FOUND", `release not found: ${id}`, 404);
    }

    if (input.projectId !== undefined) {
      this.assertProjectExists(input.projectId);
    }

    const patch: UpdateReleaseInput & { updatedAt: string } = {
      ...input,
      projectId: input.projectId,
      version: input.version?.trim(),
      title: input.title?.trim(),
      notes: input.notes === null ? null : input.notes?.trim(),
      downloadUrl: input.downloadUrl === null ? null : input.downloadUrl?.trim(),
      updatedAt: nowIso()
    };

    const changed = this.repo.update(id, patch);
    if (!changed) {
      throw new AppError("RELEASE_UPDATE_FAILED", "failed to update release", 500);
    }

    return this.getById(id);
  }

  publish(id: string, publishedAt?: string): ReleaseEntity {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("RELEASE_NOT_FOUND", `release not found: ${id}`, 404);
    }

    const publishTime = publishedAt ?? nowIso();

    const changed = this.repo.setPublished(id, publishTime, nowIso());
    if (!changed) {
      throw new AppError("RELEASE_PUBLISH_FAILED", "failed to publish release", 500);
    }

    const item = this.getById(id);

    this.wsEvents.releaseCreated({
      id: item.id,
      version: item.version,
      channel: item.channel,
      projectId: item.projectId ?? null
    });

    return item;
  }

  deprecate(id: string): ReleaseEntity {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("RELEASE_NOT_FOUND", `release not found: ${id}`, 404);
    }

    const changed = this.repo.setDeprecated(id, nowIso());
    if (!changed) {
      throw new AppError("RELEASE_DEPRECATE_FAILED", "failed to deprecate release", 500);
    }

    return this.getById(id);
  }

  remove(id: string): void {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("RELEASE_NOT_FOUND", `release not found: ${id}`, 404);
    }

    const changed = this.repo.remove(id);
    if (!changed) {
      throw new AppError("RELEASE_DELETE_FAILED", "failed to delete release", 500);
    }
  }

  private assertProjectExists(projectId?: string | null): void {
    if (projectId === undefined || projectId === null) {
      return;
    }

    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectId}`, 400);
    }
  }
}