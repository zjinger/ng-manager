import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import { ProjectRepo } from "../project/project.repo";
import type {
  AnnouncementEntity,
  AnnouncementListItem,
  AnnouncementListResult,
  AnnouncementReadState,
  AnnouncementSnapshot,
  CreateAnnouncementInput,
  ListAnnouncementQuery,
  PublishAnnouncementInput,
  PublicListAnnouncementQuery,
  UpdateAnnouncementInput
} from "./announcement.types";
import { AnnouncementRepo } from "./announcement.repo";

export class AnnouncementService {
  constructor(
    private readonly repo: AnnouncementRepo,
    private readonly projectRepo: ProjectRepo
  ) {}

  create(input: CreateAnnouncementInput): AnnouncementEntity {
    const now = nowIso();

    this.assertProjectExists(input.projectId);

    const entity: AnnouncementEntity = {
      id: genId("ann"),
      projectId: input.projectId ?? null,
      title: input.title.trim(),
      summary: input.summary?.trim() || null,
      contentMd: input.contentMd.trim(),
      scope: input.scope,
      pinned: !!input.pinned,
      status: "draft",
      publishAt: input.publishAt ?? null,
      expireAt: input.expireAt ?? null,
      createdBy: input.createdBy?.trim() || null,
      createdAt: now,
      updatedAt: now,
      isRead: false,
      readAt: null,
      readVersion: null
    };

    this.validateTimeRange(entity.publishAt ?? undefined, entity.expireAt ?? undefined);
    this.repo.create(entity);
    return entity;
  }

  getById(id: string): AnnouncementEntity {
    const item = this.repo.findById(id);
    if (!item) {
      throw new AppError("ANNOUNCEMENT_NOT_FOUND", `announcement not found: ${id}`, 404);
    }
    return item;
  }

  getByIdWithReadState(id: string, userId: string): AnnouncementEntity {
    const item = this.getById(id);
    return this.enrichItemReadState(userId, item);
  }

  getPublicById(id: string, scope: "desktop" | "cli" | "all", projectKey?: string): AnnouncementEntity {
    if (!projectKey) {
      const item = this.repo.findPublicVisibleById(id, scope, nowIso());
      if (!item) {
        throw new AppError("ANNOUNCEMENT_NOT_FOUND", `announcement not found: ${id}`, 404);
      }
      return item;
    }

    const project = this.projectRepo.findPublicByKey(projectKey);
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectKey}`, 404);
    }

    const item = this.repo.findPublicVisibleByIdWithProjectFallback(id, project.id, scope, nowIso());
    if (!item) {
      throw new AppError("ANNOUNCEMENT_NOT_FOUND", `announcement not found: ${id}`, 404);
    }

    return item;
  }

  list(query: ListAnnouncementQuery): AnnouncementListResult {
    if (query.projectId) {
      this.assertProjectExists(query.projectId);
    }

    return this.repo.list(query);
  }

  listWithReadState(userId: string, query: ListAnnouncementQuery): AnnouncementListResult {
    return this.enrichListReadState(userId, this.list(query));
  }

  listByProjectIds(
    projectIds: string[],
    query: ListAnnouncementQuery,
    options?: { includeGlobal?: boolean }
  ): AnnouncementListResult {
    if (query.projectId) {
      this.assertProjectExists(query.projectId);
    }

    const normalizedProjectIds = Array.from(new Set(projectIds.map((item) => item.trim()).filter(Boolean)));
    return this.repo.listByProjectIds(normalizedProjectIds, query, {
      includeGlobal: options?.includeGlobal ?? false
    });
  }

  listByProjectIdsWithReadState(
    userId: string,
    projectIds: string[],
    query: ListAnnouncementQuery,
    options?: { includeGlobal?: boolean }
  ): AnnouncementListResult {
    return this.enrichListReadState(userId, this.listByProjectIds(projectIds, query, options));
  }

  listPublic(query: {
    projectKey?: string;
    includeGlobal?: boolean;
    scope?: "desktop" | "cli" | "all";
    limit: number;
  }): AnnouncementEntity[] {
    let projectId: string | null | undefined = undefined;

    if (query.projectKey) {
      const project = this.projectRepo.findPublicByKey(query.projectKey);
      if (!project) {
        throw new AppError("PROJECT_NOT_FOUND", `project not found: ${query.projectKey}`, 404);
      }
      projectId = project.id;
    } else {
      projectId = null;
    }

    const publicQuery: PublicListAnnouncementQuery = {
      projectId,
      includeGlobal: query.includeGlobal ?? true,
      scope: query.scope,
      limit: Math.max(1, Math.min(query.limit, 100))
    };

    return this.repo.listPublicVisible(publicQuery, nowIso());
  }

  update(id: string, input: UpdateAnnouncementInput): AnnouncementEntity {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("ANNOUNCEMENT_NOT_FOUND", `announcement not found: ${id}`, 404);
    }

    if (input.projectId !== undefined) {
      this.assertProjectExists(input.projectId);
    }

    const nextPublishAt = input.publishAt !== undefined ? input.publishAt ?? null : existing.publishAt ?? null;
    const nextExpireAt = input.expireAt !== undefined ? input.expireAt ?? null : existing.expireAt ?? null;

    this.validateTimeRange(nextPublishAt ?? undefined, nextExpireAt ?? undefined);

    const patch: UpdateAnnouncementInput & { updatedAt: string } = {
      ...input,
      projectId: input.projectId,
      title: input.title?.trim(),
      summary: input.summary?.trim(),
      contentMd: input.contentMd?.trim(),
      updatedAt: nowIso()
    };

    const changed = this.repo.update(id, patch);
    if (!changed) {
      throw new AppError("ANNOUNCEMENT_UPDATE_FAILED", "failed to update announcement", 500);
    }

    return this.getById(id);
  }

  publish(id: string, input: PublishAnnouncementInput): AnnouncementEntity {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("ANNOUNCEMENT_NOT_FOUND", `announcement not found: ${id}`, 404);
    }

    const publishAt = input.publishAt ?? existing.publishAt ?? nowIso();
    this.validateTimeRange(publishAt, existing.expireAt ?? undefined);

    const changed = this.repo.setStatus(id, "published", publishAt, nowIso());
    if (!changed) {
      throw new AppError("ANNOUNCEMENT_PUBLISH_FAILED", "failed to publish announcement", 500);
    }

    return this.getById(id);
  }

  archive(id: string): AnnouncementEntity {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("ANNOUNCEMENT_NOT_FOUND", `announcement not found: ${id}`, 404);
    }

    const changed = this.repo.setStatus(id, "archived", existing.publishAt ?? null, nowIso());
    if (!changed) {
      throw new AppError("ANNOUNCEMENT_ARCHIVE_FAILED", "failed to archive announcement", 500);
    }

    return this.getById(id);
  }

  markRead(id: string, userId: string): AnnouncementEntity {
    const item = this.getById(id);
    const now = nowIso();
    this.repo.markRead(userId, { id: item.id, updatedAt: item.updatedAt }, now);
    return {
      ...item,
      isRead: true,
      readAt: now,
      readVersion: item.updatedAt
    };
  }

  markAllPublishedRead(userId: string): number {
    return this.markSnapshotsRead(userId, this.repo.listPublishedSnapshots());
  }

  markPublishedReadByProjectIds(userId: string, projectIds: string[], options?: { includeGlobal?: boolean }): number {
    return this.markSnapshotsRead(
      userId,
      this.repo.listPublishedSnapshotsByProjectIds(projectIds, { includeGlobal: options?.includeGlobal ?? false })
    );
  }

  private markSnapshotsRead(userId: string, snapshots: AnnouncementSnapshot[]): number {
    const now = nowIso();
    return this.repo.markReads(userId, snapshots, now);
  }

  private enrichListReadState(userId: string, result: AnnouncementListResult): AnnouncementListResult {
    const readMap = this.repo.findReadStates(userId, result.items.map((item) => item.id));
    return {
      ...result,
      items: result.items.map((item) => this.applyReadState(item, readMap.get(item.id)))
    };
  }

  private enrichItemReadState(userId: string, item: AnnouncementEntity): AnnouncementEntity {
    const readMap = this.repo.findReadStates(userId, [item.id]);
    return this.applyReadState(item, readMap.get(item.id));
  }

  private applyReadState<T extends AnnouncementEntity | AnnouncementListItem>(
    item: T,
    readState?: AnnouncementReadState
  ): T {
    const readVersion = readState?.readVersion ?? null;
    return {
      ...item,
      isRead: !!readVersion && readVersion === item.updatedAt,
      readAt: readState?.readAt ?? null,
      readVersion
    };
  }

  private assertProjectExists(projectId?: string | null) {
    if (projectId === undefined || projectId === null) return;

    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectId}`, 400);
    }
  }

  private validateTimeRange(publishAt?: string, expireAt?: string) {
    if (!publishAt || !expireAt) return;

    const publishMs = Date.parse(publishAt);
    const expireMs = Date.parse(expireAt);

    if (Number.isNaN(publishMs) || Number.isNaN(expireMs)) {
      throw new AppError("INVALID_TIME_RANGE", "invalid publishAt or expireAt", 400);
    }

    if (expireMs <= publishMs) {
      throw new AppError("INVALID_TIME_RANGE", "expireAt must be greater than publishAt", 400);
    }
  }
}
