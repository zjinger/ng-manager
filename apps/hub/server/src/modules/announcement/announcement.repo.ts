import type Database from "better-sqlite3";
import type {
  AnnouncementEntity,
  AnnouncementListItem,
  AnnouncementListResult,
  ListAnnouncementQuery,
  PublicListAnnouncementQuery,
  UpdateAnnouncementInput
} from "./announcement.types";

type AnnouncementRow = {
  id: string;
  project_id: string | null;
  title: string;
  summary: string | null;
  content_md: string;
  scope: string;
  pinned: number;
  status: string;
  publish_at: string | null;
  expire_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export class AnnouncementRepo {
  constructor(private readonly db: Database.Database) { }

  create(entity: AnnouncementEntity): void {
    const stmt = this.db.prepare(`
      INSERT INTO announcements (
        id, project_id, title, summary, content_md, scope, pinned, status,
        publish_at, expire_at, created_by, created_at, updated_at
      ) VALUES (
        @id, @project_id, @title, @summary, @content_md, @scope, @pinned, @status,
        @publish_at, @expire_at, @created_by, @created_at, @updated_at
      )
    `);

    stmt.run({
      id: entity.id,
      project_id: entity.projectId ?? null,
      title: entity.title,
      summary: entity.summary ?? null,
      content_md: entity.contentMd,
      scope: entity.scope,
      pinned: entity.pinned ? 1 : 0,
      status: entity.status,
      publish_at: entity.publishAt ?? null,
      expire_at: entity.expireAt ?? null,
      created_by: entity.createdBy ?? null,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    });
  }

  findById(id: string): AnnouncementEntity | null {
    const row = this.db
      .prepare(`SELECT * FROM announcements WHERE id = ?`)
      .get(id) as AnnouncementRow | undefined;

    return row ? this.toEntity(row) : null;
  }

  findPublicVisibleById(
    id: string,
    scope: "desktop" | "cli" | "all",
    now: string
  ): AnnouncementEntity | null {
    let sql = `
      SELECT *
      FROM announcements
      WHERE id = ?
        AND status = 'published'
        AND project_id IS NULL
        AND (expire_at IS NULL OR expire_at > ?)
    `;
    const params: unknown[] = [id, now];

    if (scope === "all") {
      sql += ` AND scope = 'all' `;
    } else {
      sql += ` AND (scope = 'all' OR scope = ?) `;
      params.push(scope);
    }

    const row = this.db.prepare(sql).get(...params) as AnnouncementRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  findPublicVisibleByIdWithProjectFallback(
    id: string,
    projectId: string,
    scope: "desktop" | "cli" | "all",
    now: string
  ): AnnouncementEntity | null {
    let sql = `
      SELECT *
      FROM announcements
      WHERE id = ?
        AND status = 'published'
        AND (project_id = ? OR project_id IS NULL)
        AND (expire_at IS NULL OR expire_at > ?)
    `;
    const params: unknown[] = [id, projectId, now];

    if (scope === "all") {
      sql += ` AND scope = 'all' `;
    } else {
      sql += ` AND (scope = 'all' OR scope = ?) `;
      params.push(scope);
    }

    sql += `
      ORDER BY
        CASE WHEN project_id = ? THEN 0 ELSE 1 END,
        pinned DESC,
        COALESCE(publish_at, created_at) DESC,
        created_at DESC
      LIMIT 1
    `;
    params.push(projectId);

    const row = this.db.prepare(sql).get(...params) as AnnouncementRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  update(id: string, patch: UpdateAnnouncementInput & { updatedAt: string }): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.projectId !== undefined) {
      fields.push("project_id = ?");
      params.push(patch.projectId ?? null);
    }

    if (patch.title !== undefined) {
      fields.push("title = ?");
      params.push(patch.title);
    }

    if (patch.summary !== undefined) {
      fields.push("summary = ?");
      params.push(patch.summary ?? null);
    }

    if (patch.contentMd !== undefined) {
      fields.push("content_md = ?");
      params.push(patch.contentMd);
    }

    if (patch.scope !== undefined) {
      fields.push("scope = ?");
      params.push(patch.scope);
    }

    if (patch.pinned !== undefined) {
      fields.push("pinned = ?");
      params.push(patch.pinned ? 1 : 0);
    }

    if (patch.publishAt !== undefined) {
      fields.push("publish_at = ?");
      params.push(patch.publishAt ?? null);
    }

    if (patch.expireAt !== undefined) {
      fields.push("expire_at = ?");
      params.push(patch.expireAt ?? null);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);

    params.push(id);

    const result = this.db
      .prepare(`UPDATE announcements SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);

    return result.changes > 0;
  }

  setStatus(id: string, status: AnnouncementEntity["status"], publishAt: string | null, updatedAt: string): boolean {
    const result = this.db
      .prepare(`
        UPDATE announcements
        SET status = ?, publish_at = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(status, publishAt, updatedAt, id);

    return result.changes > 0;
  }

  list(query: ListAnnouncementQuery): AnnouncementListResult {
    const where: string[] = [];
    const params: unknown[] = [];

    if (query.projectId !== undefined) {
      if (query.projectId === null) {
        where.push("project_id IS NULL");
      } else {
        where.push("project_id = ?");
        params.push(query.projectId);
      }
    }

    if (query.status) {
      where.push("status = ?");
      params.push(query.status);
    }

    if (query.scope) {
      if (query.scope === "all") {
        where.push("scope = ?");
        params.push("all");
      } else {
        where.push("(scope = ? OR scope = 'all')");
        params.push(query.scope);
      }
    }

    if (query.pinned !== undefined) {
      where.push("pinned = ?");
      params.push(query.pinned ? 1 : 0);
    }

    if (query.keyword) {
      where.push("(title LIKE ? OR summary LIKE ? OR content_md LIKE ?)");
      params.push(`%${query.keyword}%`, `%${query.keyword}%`, `%${query.keyword}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (query.page - 1) * query.pageSize;

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM announcements ${whereSql}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(`
        SELECT *
        FROM announcements
        ${whereSql}
        ORDER BY pinned DESC, COALESCE(publish_at, created_at) DESC, created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, query.pageSize, offset) as AnnouncementRow[];

    return {
      items: rows.map((row) => this.toListItem(row)),
      page: query.page,
      pageSize: query.pageSize,
      total: totalRow.total
    };
  }

  listPublicVisible(
    query: PublicListAnnouncementQuery,
    now: string
  ): AnnouncementEntity[] {
    let sql = `
      SELECT *
      FROM announcements
      WHERE status = 'published'
        AND (expire_at IS NULL OR expire_at > ?)
    `;
    const params: unknown[] = [now];

    if (query.projectId === undefined || query.projectId === null) {
      sql += ` AND project_id IS NULL `;
    } else if (query.includeGlobal) {
      sql += ` AND (project_id = ? OR project_id IS NULL) `;
      params.push(query.projectId);
    } else {
      sql += ` AND project_id = ? `;
      params.push(query.projectId);
    }

    if (query.scope) {
      if (query.scope === "all") {
        sql += ` AND scope = 'all' `;
      } else {
        sql += ` AND (scope = 'all' OR scope = ?) `;
        params.push(query.scope);
      }
    }

    sql += `
      ORDER BY
        CASE WHEN project_id IS NULL THEN 1 ELSE 0 END,
        pinned DESC,
        COALESCE(publish_at, created_at) DESC,
        created_at DESC
      LIMIT ?
    `;
    params.push(query.limit ?? 10);

    const rows = this.db.prepare(sql).all(...params) as AnnouncementRow[];
    return rows.map((row) => this.toEntity(row));
  }

  private toEntity(row: AnnouncementRow): AnnouncementEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      summary: row.summary,
      contentMd: row.content_md,
      scope: row.scope as AnnouncementEntity["scope"],
      pinned: row.pinned === 1,
      status: row.status as AnnouncementEntity["status"],
      publishAt: row.publish_at,
      expireAt: row.expire_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private toListItem(row: AnnouncementRow): AnnouncementListItem {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      summary: row.summary,
      scope: row.scope as AnnouncementListItem["scope"],
      pinned: row.pinned === 1,
      status: row.status as AnnouncementListItem["status"],
      publishAt: row.publish_at,
      expireAt: row.expire_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}