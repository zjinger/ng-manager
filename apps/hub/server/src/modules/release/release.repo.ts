import type Database from "better-sqlite3";
import type {
  ListReleaseQuery,
  ReleaseEntity,
  ReleaseListResult,
  UpdateReleaseInput
} from "./release.types";

type ReleaseRow = {
  id: string;
  project_id: string | null;
  channel: string;
  version: string;
  title: string;
  notes: string | null;
  download_url: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export class ReleaseRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: ReleaseEntity): void {
    this.db
      .prepare(`
        INSERT INTO releases (
          id, project_id, channel, version, title, notes, download_url, status, published_at, created_at, updated_at
        ) VALUES (
          @id, @project_id, @channel, @version, @title, @notes, @download_url, @status, @published_at, @created_at, @updated_at
        )
      `)
      .run({
        id: entity.id,
        project_id: entity.projectId ?? null,
        channel: entity.channel,
        version: entity.version,
        title: entity.title,
        notes: entity.notes ?? null,
        download_url: entity.downloadUrl ?? null,
        status: entity.status,
        published_at: entity.publishedAt ?? null,
        created_at: entity.createdAt,
        updated_at: entity.updatedAt
      });
  }

  findById(id: string): ReleaseEntity | null {
    const row = this.db.prepare(`SELECT * FROM releases WHERE id = ?`).get(id) as ReleaseRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  update(id: string, patch: UpdateReleaseInput & { updatedAt: string }): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.projectId !== undefined) {
      fields.push("project_id = ?");
      params.push(patch.projectId ?? null);
    }
    if (patch.channel !== undefined) {
      fields.push("channel = ?");
      params.push(patch.channel);
    }
    if (patch.version !== undefined) {
      fields.push("version = ?");
      params.push(patch.version);
    }
    if (patch.title !== undefined) {
      fields.push("title = ?");
      params.push(patch.title);
    }
    if (patch.notes !== undefined) {
      fields.push("notes = ?");
      params.push(patch.notes ?? null);
    }
    if (patch.downloadUrl !== undefined) {
      fields.push("download_url = ?");
      params.push(patch.downloadUrl ?? null);
    }
    if (patch.status !== undefined) {
      fields.push("status = ?");
      params.push(patch.status);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);
    params.push(id);

    const result = this.db
      .prepare(`UPDATE releases SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);

    return result.changes > 0;
  }

  setPublished(id: string, publishedAt: string, updatedAt: string): boolean {
    const result = this.db
      .prepare(`
        UPDATE releases
        SET status = 'published', published_at = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(publishedAt, updatedAt, id);

    return result.changes > 0;
  }

  setDeprecated(id: string, updatedAt: string): boolean {
    const result = this.db
      .prepare(`
        UPDATE releases
        SET status = 'deprecated', updated_at = ?
        WHERE id = ?
      `)
      .run(updatedAt, id);

    return result.changes > 0;
  }

  remove(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM releases WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  list(query: ListReleaseQuery): ReleaseListResult {
    const where: string[] = [];
    const params: unknown[] = [];

    if (query.projectId) {
      where.push("project_id = ?");
      params.push(query.projectId);
    }
    if (query.channel) {
      where.push("channel = ?");
      params.push(query.channel);
    }
    if (query.status) {
      where.push("status = ?");
      params.push(query.status);
    }
    if (query.keyword) {
      where.push("(version LIKE ? OR title LIKE ? OR notes LIKE ?)");
      params.push(`%${query.keyword}%`, `%${query.keyword}%`, `%${query.keyword}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (query.page - 1) * query.pageSize;

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM releases ${whereSql}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(`
        SELECT *
        FROM releases
        ${whereSql}
        ORDER BY COALESCE(published_at, updated_at) DESC, created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, query.pageSize, offset) as ReleaseRow[];

    return {
      items: rows.map((row) => this.toEntity(row)),
      page: query.page,
      pageSize: query.pageSize,
      total: totalRow.total
    };
  }

  private toEntity(row: ReleaseRow): ReleaseEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      channel: row.channel as ReleaseEntity["channel"],
      version: row.version,
      title: row.title,
      notes: row.notes,
      downloadUrl: row.download_url,
      status: row.status as ReleaseEntity["status"],
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}