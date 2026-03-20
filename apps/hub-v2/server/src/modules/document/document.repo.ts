import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type { DocumentEntity, DocumentListResult, ListDocumentsQuery } from "./document.types";

type DocumentRow = {
  id: string;
  project_id: string | null;
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  content_md: string;
  status: "draft" | "published" | "archived";
  version: string | null;
  created_by: string | null;
  publish_at: string | null;
  created_at: string;
  updated_at: string;
};

export class DocumentRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: DocumentEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO documents (
          id, project_id, slug, title, category, summary, content_md, status,
          version, created_by, publish_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.slug,
        entity.title,
        entity.category,
        entity.summary,
        entity.contentMd,
        entity.status,
        entity.version,
        entity.createdBy,
        entity.publishAt,
        entity.createdAt,
        entity.updatedAt
      );
  }

  update(id: string, changes: Partial<DocumentEntity>): boolean {
    const current = this.findById(id);
    if (!current) {
      return false;
    }

    const next: DocumentEntity = { ...current, ...changes };
    const result = this.db
      .prepare(
        `
        UPDATE documents
        SET project_id = ?, slug = ?, title = ?, category = ?, summary = ?, content_md = ?,
            status = ?, version = ?, created_by = ?, publish_at = ?, created_at = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        next.projectId,
        next.slug,
        next.title,
        next.category,
        next.summary,
        next.contentMd,
        next.status,
        next.version,
        next.createdBy,
        next.publishAt,
        next.createdAt,
        next.updatedAt,
        id
      );

    return result.changes > 0;
  }

  findById(id: string): DocumentEntity | null {
    const row = this.db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as DocumentRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findBySlug(slug: string): DocumentEntity | null {
    const row = this.db.prepare("SELECT * FROM documents WHERE slug = ?").get(slug) as DocumentRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  list(query: ListDocumentsQuery): DocumentListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }

    if (query.projectId?.trim()) {
      conditions.push("project_id = ?");
      params.push(query.projectId.trim());
    }

    if (query.category?.trim()) {
      conditions.push("category = ?");
      params.push(query.category.trim());
    }

    if (query.keyword?.trim()) {
      conditions.push("(title LIKE ? OR slug LIKE ? OR summary LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM documents ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT * FROM documents
          ${whereClause}
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as DocumentRow[];

    return {
      items: rows.map((row) => this.mapRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  listPublic(projectIds: string[], query: ListDocumentsQuery): DocumentListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = ["status = 'published'"];
    const params: unknown[] = [];

    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(", ");
      conditions.push(`(project_id IS NULL OR project_id IN (${placeholders}))`);
      params.push(...projectIds);
    } else {
      conditions.push("project_id IS NULL");
    }

    if (query.category?.trim()) {
      conditions.push("category = ?");
      params.push(query.category.trim());
    }

    if (query.keyword?.trim()) {
      conditions.push("(title LIKE ? OR slug LIKE ? OR summary LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM documents ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT * FROM documents
          ${whereClause}
          ORDER BY publish_at DESC, updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as DocumentRow[];

    return {
      items: rows.map((row) => this.mapRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  private mapRow(row: DocumentRow): DocumentEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      summary: row.summary,
      contentMd: row.content_md,
      status: row.status,
      version: row.version,
      createdBy: row.created_by,
      publishAt: row.publish_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
