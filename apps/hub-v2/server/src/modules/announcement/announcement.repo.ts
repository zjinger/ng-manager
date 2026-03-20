import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  AnnouncementEntity,
  AnnouncementListResult,
  ListAnnouncementsQuery
} from "./announcement.types";

type AnnouncementRow = {
  id: string;
  project_id: string | null;
  title: string;
  summary: string | null;
  content_md: string;
  scope: "global" | "project";
  pinned: number;
  status: "draft" | "published" | "archived";
  publish_at: string | null;
  expire_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export class AnnouncementRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: AnnouncementEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO announcements (
          id, project_id, title, summary, content_md, scope, pinned, status,
          publish_at, expire_at, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.title,
        entity.summary,
        entity.contentMd,
        entity.scope,
        entity.pinned ? 1 : 0,
        entity.status,
        entity.publishAt,
        entity.expireAt,
        entity.createdBy,
        entity.createdAt,
        entity.updatedAt
      );
  }

  update(id: string, changes: Partial<AnnouncementEntity>): boolean {
    const current = this.findById(id);
    if (!current) {
      return false;
    }

    const next: AnnouncementEntity = { ...current, ...changes };
    const result = this.db
      .prepare(
        `
        UPDATE announcements
        SET project_id = ?, title = ?, summary = ?, content_md = ?, scope = ?, pinned = ?, status = ?,
            publish_at = ?, expire_at = ?, created_by = ?, created_at = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        next.projectId,
        next.title,
        next.summary,
        next.contentMd,
        next.scope,
        next.pinned ? 1 : 0,
        next.status,
        next.publishAt,
        next.expireAt,
        next.createdBy,
        next.createdAt,
        next.updatedAt,
        id
      );

    return result.changes > 0;
  }

  findById(id: string): AnnouncementEntity | null {
    const row = this.db
      .prepare("SELECT * FROM announcements WHERE id = ?")
      .get(id) as AnnouncementRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  list(query: ListAnnouncementsQuery): AnnouncementListResult {
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

    if (query.keyword?.trim()) {
      conditions.push("(title LIKE ? OR summary LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM announcements ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT * FROM announcements
          ${whereClause}
          ORDER BY pinned DESC, updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as AnnouncementRow[];

    return {
      items: rows.map((row) => this.mapRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  listPublic(projectIds: string[], query: ListAnnouncementsQuery): AnnouncementListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = ["status = 'published'"];
    const params: unknown[] = [];

    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(", ");
      conditions.push(`(scope = 'global' OR project_id IN (${placeholders}))`);
      params.push(...projectIds);
    } else {
      conditions.push("(scope = 'global' OR project_id IS NULL)");
    }

    if (query.keyword?.trim()) {
      conditions.push("(title LIKE ? OR summary LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM announcements ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT * FROM announcements
          ${whereClause}
          ORDER BY pinned DESC, publish_at DESC, updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as AnnouncementRow[];

    return {
      items: rows.map((row) => this.mapRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  listRecentForDashboard(projectIds: string[], limit: number): AnnouncementEntity[] {
    const conditions: string[] = ["status = 'published'"];
    const params: unknown[] = [];

    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(", ");
      conditions.push(`(scope = 'global' OR project_id IN (${placeholders}))`);
      params.push(...projectIds);
    } else {
      conditions.push("(scope = 'global' OR project_id IS NULL)");
    }

    const rows = this.db
      .prepare(
        `
          SELECT * FROM announcements
          WHERE ${conditions.join(" AND ")}
          ORDER BY pinned DESC, publish_at DESC, updated_at DESC
          LIMIT ?
        `
      )
      .all(...params, limit) as AnnouncementRow[];

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: AnnouncementRow): AnnouncementEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      summary: row.summary,
      contentMd: row.content_md,
      scope: row.scope,
      pinned: row.pinned === 1,
      status: row.status,
      publishAt: row.publish_at,
      expireAt: row.expire_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
