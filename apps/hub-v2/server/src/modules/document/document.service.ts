import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import type { EventBus } from "../../shared/event/event-bus";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ContentLogCommandContract } from "../content-log/content-log.contract";
import type { ProjectAccessContract } from "../project/project-access.contract";
import { requireAdmin } from "../utils/require-admin";
import type { DocumentCommandContract, DocumentQueryContract } from "./document.contract";
import { DocumentRepo } from "./document.repo";
import type {
  CreateDocumentInput,
  DocumentEntity,
  DocumentListResult,
  ListDocumentsQuery,
  UpdateDocumentInput
} from "./document.types";

export class DocumentService implements DocumentCommandContract, DocumentQueryContract {
  constructor(
    private readonly repo: DocumentRepo,
    private readonly projectAccess: ProjectAccessContract,
    private readonly eventBus: EventBus,
    private readonly contentLogCommand: ContentLogCommandContract
  ) {}

  async create(input: CreateDocumentInput, ctx: RequestContext): Promise<DocumentEntity> {
    const projectId = input.projectId?.trim() || null;
    if (this.repo.findBySlug(input.slug.trim())) {
      throw new AppError("DOCUMENT_SLUG_EXISTS", `document slug already exists: ${input.slug}`, 409);
    }
    await this.requireProjectOrAdmin(projectId, ctx, "create document");

    const now = nowIso();
    const entity: DocumentEntity = {
      id: genId("doc"),
      projectId,
      slug: input.slug.trim(),
      title: input.title.trim(),
      category: input.category?.trim() || "general",
      summary: input.summary?.trim() || null,
      contentMd: input.contentMd,
      status: "draft",
      version: input.version?.trim() || null,
      createdBy: ctx.accountId,
      publishAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
    this.recordContentLog("created", entity, ctx, "创建文档");
    return entity;
  }

  async update(id: string, input: UpdateDocumentInput, ctx: RequestContext): Promise<DocumentEntity> {
    const current = this.requireById(id);

    if (input.slug?.trim() && input.slug.trim() !== current.slug) {
      const bySlug = this.repo.findBySlug(input.slug.trim());
      if (bySlug && bySlug.id !== current.id) {
        throw new AppError("DOCUMENT_SLUG_EXISTS", `document slug already exists: ${input.slug}`, 409);
      }
    }

    const nextProjectId =
      input.projectId === undefined ? current.projectId : input.projectId?.trim() || null;
    await this.requireProjectOrAdmin(nextProjectId, ctx, "update document");

    const updated = this.repo.update(id, {
      projectId: nextProjectId,
      slug: input.slug?.trim() || current.slug,
      title: input.title?.trim() || current.title,
      category: input.category?.trim() || current.category,
      summary: input.summary === undefined ? current.summary : input.summary?.trim() || null,
      contentMd: input.contentMd ?? current.contentMd,
      version: input.version === undefined ? current.version : input.version?.trim() || null,
      updatedAt: nowIso()
    });

    if (!updated) {
      throw new AppError("DOCUMENT_UPDATE_FAILED", "failed to update document", 500);
    }

    const entity = this.requireById(id);
    await this.eventBus.emit({
      type: "document.updated",
      scope: entity.projectId ? "project" : "global",
      projectId: entity.projectId ?? undefined,
      entityType: "document",
      entityId: entity.id,
      action: "updated",
      actorId: ctx.accountId,
      occurredAt: entity.updatedAt,
      payload: {
        title: entity.title,
        status: entity.status,
        slug: entity.slug
      }
    });
    this.recordContentLog("updated", entity, ctx, "更新文档");

    return entity;
  }

  async publish(id: string, ctx: RequestContext): Promise<DocumentEntity> {
    const current = this.requireById(id);
    await this.requireProjectOrAdmin(current.projectId, ctx, "publish document");

    const publishAt = nowIso();
    const updated = this.repo.update(id, {
      status: "published",
      publishAt,
      updatedAt: publishAt
    });

    if (!updated) {
      throw new AppError("DOCUMENT_PUBLISH_FAILED", "failed to publish document", 500);
    }

    const entity = this.requireById(id);
    await this.eventBus.emit({
      type: "document.published",
      scope: entity.projectId ? "project" : "global",
      projectId: entity.projectId ?? undefined,
      entityType: "document",
      entityId: entity.id,
      action: "published",
      actorId: ctx.accountId,
      occurredAt: entity.publishAt || entity.updatedAt,
      payload: {
        title: entity.title,
        slug: entity.slug
      }
    });
    this.recordContentLog("published", entity, ctx, "发布文档");

    return entity;
  }

  async archive(id: string, ctx: RequestContext): Promise<DocumentEntity> {
    const current = this.requireById(id);
    await this.requireProjectOrAdmin(current.projectId, ctx, "archive document");
    if (current.status === "archived") {
      return current;
    }

    const updatedAt = nowIso();
    const updated = this.repo.update(id, {
      status: "archived",
      updatedAt
    });

    if (!updated) {
      throw new AppError("DOCUMENT_ARCHIVE_FAILED", "failed to archive document", 500);
    }

    const entity = this.requireById(id);
    await this.eventBus.emit({
      type: "document.archived",
      scope: entity.projectId ? "project" : "global",
      projectId: entity.projectId ?? undefined,
      entityType: "document",
      entityId: entity.id,
      action: "archived",
      actorId: ctx.accountId,
      occurredAt: entity.updatedAt,
      payload: {
        title: entity.title,
        slug: entity.slug
      }
    });
    this.recordContentLog("archived", entity, ctx, "归档文档");

    return entity;
  }

  async list(query: ListDocumentsQuery, ctx: RequestContext): Promise<DocumentListResult> {
    const projectId = query.projectId?.trim();
    if (projectId) {
      await this.projectAccess.requireProjectAccess(projectId, ctx, "list documents");
    } else {
      requireAdmin(ctx);
    }
    return this.repo.list(query);
  }

  async getById(id: string, ctx: RequestContext): Promise<DocumentEntity> {
    const entity = this.requireById(id);
    await this.requireProjectOrAdmin(entity.projectId, ctx, "get document");
    return entity;
  }

  async listPublic(query: ListDocumentsQuery, ctx: RequestContext): Promise<DocumentListResult> {
    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    return this.repo.listPublic(projectIds, query);
  }

  async listRecentPublishedForNotifications(
    projectIds: string[],
    limit: number,
    _ctx: RequestContext
  ): Promise<DocumentEntity[]> {
    return this.repo.listRecentPublishedForNotifications(projectIds, limit);
  }

  async listRecentArchivedForNotifications(
    projectIds: string[],
    limit: number,
    _ctx: RequestContext
  ): Promise<DocumentEntity[]> {
    return this.repo.listRecentArchivedForNotifications(projectIds, limit);
  }

  async getPublicBySlug(slug: string): Promise<DocumentEntity> {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      throw new AppError("DOCUMENT_NOT_FOUND", "document not found", 404);
    }
    const entity = this.repo.findPublishedBySlug(normalizedSlug);
    if (!entity) {
      throw new AppError("DOCUMENT_NOT_FOUND", `document not found: ${slug}`, 404);
    }
    return entity;
  }

  private requireById(id: string): DocumentEntity {
    const entity = this.repo.findById(id);
    if (!entity) {
      throw new AppError("DOCUMENT_NOT_FOUND", `document not found: ${id}`, 404);
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
    entity: DocumentEntity,
    ctx: RequestContext,
    summary: string
  ): void {
    this.contentLogCommand.create({
      id: genId("clog"),
      projectId: entity.projectId,
      contentType: "document",
      contentId: entity.id,
      actionType,
      title: entity.title,
      summary,
      operatorId: ctx.userId ?? null,
      operatorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      metaJson: JSON.stringify({ status: entity.status, slug: entity.slug, version: entity.version }),
      createdAt: nowIso()
    });
  }
}

