import Database from "better-sqlite3";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import type {
  CreateDocumentInput,
  DocumentEntity,
  DocumentListResult,
  ListDocumentQuery,
  UpdateDocumentInput
} from "./document.types";
import { DocumentRepo } from "./document.repo";

export class DocumentService {
  constructor(private readonly repo: DocumentRepo) {}

  create(input: CreateDocumentInput): DocumentEntity {
    const now = nowIso();

    try {
      const entity: DocumentEntity = {
        id: genId("doc"),
        slug: input.slug.trim(),
        title: input.title.trim(),
        category: input.category,
        summary: input.summary?.trim() || null,
        contentMd: input.contentMd.trim(),
        status: "draft",
        version: input.version?.trim() || null,
        createdBy: input.createdBy?.trim() || null,
        createdAt: now,
        updatedAt: now
      };

      this.repo.create(entity);
      return entity;
    } catch (error) {
      this.handleSqliteError(error, input.slug);
    }
  }

  getById(id: string): DocumentEntity {
    const item = this.repo.findById(id);
    if (!item) {
      throw new AppError("DOCUMENT_NOT_FOUND", `document not found: ${id}`, 404);
    }
    return item;
  }

  getPublicBySlug(slug: string): DocumentEntity {
    const item = this.repo.findPublishedBySlug(slug);
    if (!item) {
      throw new AppError("DOCUMENT_NOT_FOUND", `document not found: ${slug}`, 404);
    }
    return item;
  }

  list(query: ListDocumentQuery): DocumentListResult {
    return this.repo.list(query);
  }

  listPublic(query: Omit<ListDocumentQuery, "status">): DocumentListResult {
    return this.repo.listPublished(query);
  }

  update(id: string, input: UpdateDocumentInput): DocumentEntity {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("DOCUMENT_NOT_FOUND", `document not found: ${id}`, 404);
    }

    try {
      const patch: UpdateDocumentInput & { updatedAt: string } = {
        ...input,
        slug: input.slug?.trim(),
        title: input.title?.trim(),
        summary: input.summary?.trim(),
        contentMd: input.contentMd?.trim(),
        version: input.version === null ? null : input.version?.trim(),
        updatedAt: nowIso()
      };

      const changed = this.repo.update(id, patch);
      if (!changed) {
        throw new AppError("DOCUMENT_UPDATE_FAILED", "failed to update document", 500);
      }

      return this.getById(id);
    } catch (error) {
      this.handleSqliteError(error, input.slug);
    }
  }

  publish(id: string): DocumentEntity {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("DOCUMENT_NOT_FOUND", `document not found: ${id}`, 404);
    }

    const changed = this.repo.setStatus(id, "published", nowIso());
    if (!changed) {
      throw new AppError("DOCUMENT_PUBLISH_FAILED", "failed to publish document", 500);
    }

    return this.getById(id);
  }

  archive(id: string): DocumentEntity {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("DOCUMENT_NOT_FOUND", `document not found: ${id}`, 404);
    }

    const changed = this.repo.setStatus(id, "archived", nowIso());
    if (!changed) {
      throw new AppError("DOCUMENT_ARCHIVE_FAILED", "failed to archive document", 500);
    }

    return this.getById(id);
  }

  remove(id: string): void {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("DOCUMENT_NOT_FOUND", `document not found: ${id}`, 404);
    }

    const changed = this.repo.remove(id);
    if (!changed) {
      throw new AppError("DOCUMENT_DELETE_FAILED", "failed to delete document", 500);
    }
  }

  private handleSqliteError(error: unknown, slug?: string): never {
    if (error instanceof AppError) {
      throw error;
    }

    if (
      error instanceof Database.SqliteError &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      throw new AppError(
        "DOCUMENT_SLUG_EXISTS",
        `document slug already exists: ${slug ?? "unknown"}`,
        409
      );
    }

    throw error;
  }
}