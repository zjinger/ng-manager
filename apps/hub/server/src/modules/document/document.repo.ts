import type Database from "better-sqlite3";
import type {
  DocumentEntity,
  DocumentListItem,
  DocumentListResult,
  ListDocumentQuery,
  UpdateDocumentInput
} from "./document.types";

type DocumentRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  content_md: string;
  status: string;
  version: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export class DocumentRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: DocumentEntity): void {
    const stmt = this.db.prepare(`
      INSERT INTO documents (
        id, slug, title, category, summary, content_md,
        status, version, created_by, created_at, updated_at
      ) VALUES (
        @id, @slug, @title, @category, @summary, @content_md,
        @status, @version, @created_by, @created_at, @updated_at
      )
    `);

    stmt.run({
      id: entity.id,
      slug: entity.slug,
      title: entity.title,
      category: entity.category,
      summary: entity.summary ?? null,
      content_md: entity.contentMd,
      status: entity.status,
      version: entity.version ?? null,
      created_by: entity.createdBy ?? null,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    });
  }

  findById(id: string): DocumentEntity | null {
    const row = this.db
      .prepare(`SELECT * FROM documents WHERE id = ?`)
      .get(id) as DocumentRow | undefined;

    return row ? this.toEntity(row) : null;
  }

  findBySlug(slug: string): DocumentEntity | null {
    const row = this.db
      .prepare(`SELECT * FROM documents WHERE slug = ?`)
      .get(slug) as DocumentRow | undefined;

    return row ? this.toEntity(row) : null;
  }

  findPublishedBySlug(slug: string): DocumentEntity | null {
    const row = this.db
      .prepare(`SELECT * FROM documents WHERE slug = ? AND status = 'published'`)
      .get(slug) as DocumentRow | undefined;

    return row ? this.toEntity(row) : null;
  }

  update(id: string, patch: UpdateDocumentInput & { updatedAt: string }): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.slug !== undefined) {
      fields.push("slug = ?");
      params.push(patch.slug);
    }

    if (patch.title !== undefined) {
      fields.push("title = ?");
      params.push(patch.title);
    }

    if (patch.category !== undefined) {
      fields.push("category = ?");
      params.push(patch.category);
    }

    if (patch.summary !== undefined) {
      fields.push("summary = ?");
      params.push(patch.summary ?? null);
    }

    if (patch.contentMd !== undefined) {
      fields.push("content_md = ?");
      params.push(patch.contentMd);
    }

    if (patch.version !== undefined) {
      fields.push("version = ?");
      params.push(patch.version ?? null);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);

    params.push(id);

    const result = this.db
      .prepare(`UPDATE documents SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);

    return result.changes > 0;
  }

  setStatus(id: string, status: DocumentEntity["status"], updatedAt: string): boolean {
    const result = this.db
      .prepare(`UPDATE documents SET status = ?, updated_at = ? WHERE id = ?`)
      .run(status, updatedAt, id);

    return result.changes > 0;
  }

  remove(id: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM documents WHERE id = ?`)
      .run(id);

    return result.changes > 0;
  }

  list(query: ListDocumentQuery): DocumentListResult {
    const where: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      where.push("status = ?");
      params.push(query.status);
    }

    if (query.category) {
      where.push("category = ?");
      params.push(query.category);
    }

    if (query.keyword) {
      where.push("(slug LIKE ? OR title LIKE ? OR summary LIKE ? OR content_md LIKE ?)");
      params.push(
        `%${query.keyword}%`,
        `%${query.keyword}%`,
        `%${query.keyword}%`,
        `%${query.keyword}%`
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (query.page - 1) * query.pageSize;

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM documents ${whereSql}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(`
        SELECT id, slug, title, category, summary, status, version, created_by, created_at, updated_at
        FROM documents
        ${whereSql}
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, query.pageSize, offset) as Array<
        Omit<DocumentRow, "content_md">
      >;

    return {
      items: rows.map((row) => this.toListItem(row)),
      page: query.page,
      pageSize: query.pageSize,
      total: totalRow.total
    };
  }

  listPublished(query: Omit<ListDocumentQuery, "status">): DocumentListResult {
    const where: string[] = ["status = 'published'"];
    const params: unknown[] = [];

    if (query.category) {
      where.push("category = ?");
      params.push(query.category);
    }

    if (query.keyword) {
      where.push("(slug LIKE ? OR title LIKE ? OR summary LIKE ? OR content_md LIKE ?)");
      params.push(
        `%${query.keyword}%`,
        `%${query.keyword}%`,
        `%${query.keyword}%`,
        `%${query.keyword}%`
      );
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const offset = (query.page - 1) * query.pageSize;

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM documents ${whereSql}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(`
        SELECT id, slug, title, category, summary, status, version, created_by, created_at, updated_at
        FROM documents
        ${whereSql}
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, query.pageSize, offset) as Array<
        Omit<DocumentRow, "content_md">
      >;

    return {
      items: rows.map((row) => this.toListItem(row)),
      page: query.page,
      pageSize: query.pageSize,
      total: totalRow.total
    };
  }

  private toEntity(row: DocumentRow): DocumentEntity {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category as DocumentEntity["category"],
      summary: row.summary,
      contentMd: row.content_md,
      status: row.status as DocumentEntity["status"],
      version: row.version,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private toListItem(
    row: Omit<DocumentRow, "content_md">
  ): DocumentListItem {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category as DocumentListItem["category"],
      summary: row.summary,
      status: row.status as DocumentListItem["status"],
      version: row.version,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}