import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type { DocumentEntity, DocumentListItem, DocumentListResult, ListDocumentsQuery } from "./document.types";

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
  created_by_name: string | null;
  publish_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
};

type DocumentListRow = Omit<DocumentRow, "content_md">;

const DOCUMENT_LIST_COLUMNS = [
  "d.id",
  "d.project_id",
  "d.slug",
  "d.title",
  "d.category",
  "d.summary",
  "d.status",
  "d.version",
  "d.created_by",
  `${creatorNameSql()} AS created_by_name`,
  "d.publish_at",
  "d.deleted_at",
  "d.deleted_by",
  "d.created_at",
  "d.updated_at"
].join(", ");

const DOCUMENT_CREATOR_JOINS = `
  LEFT JOIN admin_accounts creator_account ON creator_account.id = d.created_by
  LEFT JOIN users creator_account_user ON creator_account_user.id = creator_account.user_id
  LEFT JOIN users creator_user ON creator_user.id = d.created_by
`;

function detailColumns(): string {
  return `d.*, ${creatorNameSql()} AS created_by_name`;
}

function creatorNameSql(): string {
  return `
    COALESCE(
      NULLIF(creator_user.display_name, ''),
      NULLIF(creator_user.username, ''),
      NULLIF(creator_account_user.display_name, ''),
      NULLIF(creator_account.nickname, ''),
      NULLIF(creator_account.username, '')
    )
  `;
}

export class DocumentRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: DocumentEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO documents (
          id, project_id, slug, title, category, summary, content_md, status,
          version, created_by, publish_at, deleted_at, deleted_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        entity.deletedAt,
        entity.deletedBy,
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
            status = ?, version = ?, created_by = ?, publish_at = ?, deleted_at = ?, deleted_by = ?,
            created_at = ?, updated_at = ?
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
        next.deletedAt,
        next.deletedBy,
        next.createdAt,
        next.updatedAt,
        id
      );

    return result.changes > 0;
  }

  findById(id: string): DocumentEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT ${detailColumns()}
          FROM documents d
          ${DOCUMENT_CREATOR_JOINS}
          WHERE d.id = ? AND d.deleted_at IS NULL
        `
      )
      .get(id) as DocumentRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findByProjectAndId(projectId: string, id: string): DocumentEntity | null {
    const normalizedProjectId = projectId.trim();
    const normalizedId = id.trim();
    if (!normalizedProjectId || !normalizedId) {
      return null;
    }

    const row = this.db
      .prepare(
        `
          SELECT ${detailColumns()}
          FROM documents d
          ${DOCUMENT_CREATOR_JOINS}
          WHERE d.project_id = ? AND d.id = ? AND d.deleted_at IS NULL
          LIMIT 1
        `
      )
      .get(normalizedProjectId, normalizedId) as DocumentRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  existsByProjectAndSlug(projectId: string | null, slug: string, excludeId?: string): boolean {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      return false;
    }

    let row: { ok: number } | undefined;
    if (projectId?.trim()) {
      const normalizedProjectId = projectId.trim();
      row = excludeId
        ? (this.db
            .prepare(
              "SELECT 1 as ok FROM documents WHERE project_id = ? AND slug = ? AND id != ? AND deleted_at IS NULL LIMIT 1"
            )
            .get(normalizedProjectId, normalizedSlug, excludeId) as { ok: number } | undefined)
        : (this.db
            .prepare("SELECT 1 as ok FROM documents WHERE project_id = ? AND slug = ? AND deleted_at IS NULL LIMIT 1")
            .get(normalizedProjectId, normalizedSlug) as { ok: number } | undefined);
    } else {
      row = excludeId
        ? (this.db
            .prepare(
              "SELECT 1 as ok FROM documents WHERE project_id IS NULL AND slug = ? AND id != ? AND deleted_at IS NULL LIMIT 1"
            )
            .get(normalizedSlug, excludeId) as { ok: number } | undefined)
        : (this.db
            .prepare("SELECT 1 as ok FROM documents WHERE project_id IS NULL AND slug = ? AND deleted_at IS NULL LIMIT 1")
            .get(normalizedSlug) as { ok: number } | undefined);
    }
    return !!row?.ok;
  }

  findPublishedByProjectAndSlug(projectId: string, slug: string): DocumentEntity | null {
    const normalizedProjectId = projectId.trim();
    const normalizedSlug = slug.trim();
    if (!normalizedProjectId || !normalizedSlug) {
      return null;
    }

    const row = this.db
      .prepare(
        `
          SELECT ${detailColumns()}
          FROM documents d
          ${DOCUMENT_CREATOR_JOINS}
          WHERE d.project_id = ? AND d.slug = ? AND d.status = 'published' AND d.deleted_at IS NULL
          ORDER BY d.publish_at DESC, d.updated_at DESC
          LIMIT 1
        `
      )
      .get(normalizedProjectId, normalizedSlug) as DocumentRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findByProjectAndSlug(projectId: string, slug: string): DocumentEntity | null {
    const normalizedProjectId = projectId.trim();
    const normalizedSlug = slug.trim();
    if (!normalizedProjectId || !normalizedSlug) {
      return null;
    }

    const row = this.db
      .prepare(
        `
          SELECT ${detailColumns()}
          FROM documents d
          ${DOCUMENT_CREATOR_JOINS}
          WHERE d.project_id = ? AND d.slug = ? AND d.deleted_at IS NULL
          ORDER BY d.updated_at DESC
          LIMIT 1
        `
      )
      .get(normalizedProjectId, normalizedSlug) as DocumentRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  list(query: ListDocumentsQuery): DocumentListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = ["d.deleted_at IS NULL"];
    const params: unknown[] = [];

    if (query.status) {
      conditions.push("d.status = ?");
      params.push(query.status);
    } else if (query.statusGroup === "active") {
      conditions.push("d.status IN ('draft', 'published')");
    }

    if (query.projectId?.trim()) {
      conditions.push("d.project_id = ?");
      params.push(query.projectId.trim());
    }

    if (query.category?.trim()) {
      conditions.push("d.category = ?");
      params.push(query.category.trim());
    }

    if (query.keyword?.trim()) {
      conditions.push("(d.title LIKE ? OR d.slug LIKE ? OR d.summary LIKE ? OR d.content_md LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM documents d ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT ${DOCUMENT_LIST_COLUMNS}
          FROM documents d
          ${DOCUMENT_CREATOR_JOINS}
          ${whereClause}
          ORDER BY d.updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as DocumentListRow[];

    return {
      items: rows.map((row) => this.mapListRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  listPublic(projectIds: string[], query: ListDocumentsQuery): DocumentListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = ["d.status = 'published'", "d.deleted_at IS NULL"];
    const params: unknown[] = [];

    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(", ");
      conditions.push(`(d.project_id IS NULL OR d.project_id IN (${placeholders}))`);
      params.push(...projectIds);
    } else {
      conditions.push("d.project_id IS NULL");
    }

    if (query.category?.trim()) {
      conditions.push("d.category = ?");
      params.push(query.category.trim());
    }

    if (query.keyword?.trim()) {
      conditions.push("(d.title LIKE ? OR d.slug LIKE ? OR d.summary LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM documents d ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT ${DOCUMENT_LIST_COLUMNS}
          FROM documents d
          ${DOCUMENT_CREATOR_JOINS}
          ${whereClause}
          ORDER BY d.publish_at DESC, d.updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as DocumentListRow[];

    return {
      items: rows.map((row) => this.mapListRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  listRecentPublishedForNotifications(projectIds: string[], limit: number): DocumentEntity[] {
    const conditions: string[] = ["d.status = 'published'", "d.deleted_at IS NULL"];
    const params: unknown[] = [];

    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(", ");
      conditions.push(`(d.project_id IS NULL OR d.project_id IN (${placeholders}))`);
      params.push(...projectIds);
    } else {
      conditions.push("d.project_id IS NULL");
    }

    const rows = this.db
      .prepare(
        `
          SELECT ${detailColumns()}
          FROM documents d
          ${DOCUMENT_CREATOR_JOINS}
          WHERE ${conditions.join(" AND ")}
          ORDER BY d.publish_at DESC, d.updated_at DESC
          LIMIT ?
        `
      )
      .all(...params, limit) as DocumentRow[];

    return rows.map((row) => this.mapRow(row));
  }

  listRecentArchivedForNotifications(projectIds: string[], limit: number): DocumentEntity[] {
    const conditions: string[] = ["d.status = 'archived'", "d.deleted_at IS NULL"];
    const params: unknown[] = [];

    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(", ");
      conditions.push(`(d.project_id IS NULL OR d.project_id IN (${placeholders}))`);
      params.push(...projectIds);
    } else {
      conditions.push("d.project_id IS NULL");
    }

    const rows = this.db
      .prepare(
        `
          SELECT ${detailColumns()}
          FROM documents d
          ${DOCUMENT_CREATOR_JOINS}
          WHERE ${conditions.join(" AND ")}
          ORDER BY d.updated_at DESC
          LIMIT ?
        `
      )
      .all(...params, limit) as DocumentRow[];

    return rows.map((row) => this.mapRow(row));
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
      createdByName: row.created_by_name,
      publishAt: row.publish_at,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapListRow(row: DocumentListRow): DocumentListItem {
    return {
      id: row.id,
      projectId: row.project_id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      summary: row.summary,
      status: row.status,
      version: row.version,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      publishAt: row.publish_at,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
