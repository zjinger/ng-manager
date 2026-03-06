import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import type {
  AnnouncementEntity,
  AnnouncementListResult,
  CreateAnnouncementInput,
  ListAnnouncementQuery,
  PublishAnnouncementInput,
  UpdateAnnouncementInput
} from "./announcement.types";
import { AnnouncementRepo } from "./announcement.repo";

export class AnnouncementService {
  constructor(private readonly repo: AnnouncementRepo) {}

  create(input: CreateAnnouncementInput): AnnouncementEntity {
    const now = nowIso();

    const entity: AnnouncementEntity = {
      id: genId("ann"),
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
      updatedAt: now
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

  getPublicById(id: string, scope: "desktop" | "cli" | "all"): AnnouncementEntity {
    const item = this.repo.findPublicVisibleById(id, scope, nowIso());
    if (!item) {
      throw new AppError("ANNOUNCEMENT_NOT_FOUND", `announcement not found: ${id}`, 404);
    }
    return item;
  }

  list(query: ListAnnouncementQuery): AnnouncementListResult {
    return this.repo.list(query);
  }

  listPublic(scope: "desktop" | "cli" | "all", limit: number): AnnouncementEntity[] {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    return this.repo.listPublicVisible(scope, safeLimit, nowIso());
  }

  update(id: string, input: UpdateAnnouncementInput): AnnouncementEntity {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("ANNOUNCEMENT_NOT_FOUND", `announcement not found: ${id}`, 404);
    }

    const nextPublishAt = input.publishAt !== undefined ? input.publishAt ?? null : existing.publishAt ?? null;
    const nextExpireAt = input.expireAt !== undefined ? input.expireAt ?? null : existing.expireAt ?? null;

    this.validateTimeRange(nextPublishAt ?? undefined, nextExpireAt ?? undefined);

    const patch: UpdateAnnouncementInput & { updatedAt: string } = {
      ...input,
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