import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type { ListReleasesQuery, ReleaseEntity, ReleaseListResult } from "./release.types";

type ReleaseRow = {
  id: string;
  project_id: string | null;
  channel: string;
  version: string;
  title: string;
  notes: string | null;
  download_url: string | null;
  sync_project_version: number;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export class ReleaseRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: ReleaseEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO releases (
          id, project_id, channel, version, title, notes, download_url,
          sync_project_version, status, published_at, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.channel,
        entity.version,
        entity.title,
        entity.notes,
        entity.downloadUrl,
        entity.syncToProjectVersion ? 1 : 0,
        entity.status,
        entity.publishedAt,
        entity.createdBy,
        entity.createdAt,
        entity.updatedAt
      );
  }

  update(id: string, changes: Partial<ReleaseEntity>): boolean {
    const current = this.findById(id);
    if (!current) {
      return false;
    }

    const next: ReleaseEntity = { ...current, ...changes };
    const result = this.db
      .prepare(
        `
        UPDATE releases
        SET project_id = ?, channel = ?, version = ?, title = ?, notes = ?, download_url = ?,
            sync_project_version = ?, status = ?, published_at = ?, created_by = ?, created_at = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        next.projectId,
        next.channel,
        next.version,
        next.title,
        next.notes,
        next.downloadUrl,
        next.syncToProjectVersion ? 1 : 0,
        next.status,
        next.publishedAt,
        next.createdBy,
        next.createdAt,
        next.updatedAt,
        id
      );

    return result.changes > 0;
  }

  findById(id: string): ReleaseEntity | null {
    const row = this.db.prepare("SELECT * FROM releases WHERE id = ?").get(id) as ReleaseRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  existsByProjectAndVersion(projectId: string | null, version: string, excludeId?: string): boolean {
    const normalizedVersion = version.trim();
    if (!normalizedVersion) {
      return false;
    }

    if (projectId) {
      const row = excludeId
        ? this.db
            .prepare("SELECT 1 as ok FROM releases WHERE project_id = ? AND version = ? AND id != ? LIMIT 1")
            .get(projectId, normalizedVersion, excludeId)
        : this.db.prepare("SELECT 1 as ok FROM releases WHERE project_id = ? AND version = ? LIMIT 1").get(projectId, normalizedVersion);
      return !!row;
    }

    const row = excludeId
      ? this.db
          .prepare("SELECT 1 as ok FROM releases WHERE project_id IS NULL AND version = ? AND id != ? LIMIT 1")
          .get(normalizedVersion, excludeId)
      : this.db.prepare("SELECT 1 as ok FROM releases WHERE project_id IS NULL AND version = ? LIMIT 1").get(normalizedVersion);
    return !!row;
  }

  list(query: ListReleasesQuery): ReleaseListResult {
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

    if (query.channel?.trim()) {
      conditions.push("channel = ?");
      params.push(query.channel.trim());
    }

    if (query.keyword?.trim()) {
      conditions.push("(title LIKE ? OR version LIKE ? OR notes LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM releases ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT * FROM releases
          ${whereClause}
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as ReleaseRow[];

    return {
      items: rows.map((row) => this.mapRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  listPublic(query: ListReleasesQuery): ReleaseListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = ["status = 'published'"];
    const params: unknown[] = [];

    if (query.projectId?.trim()) {
      conditions.push("(project_id = ? OR project_id IS NULL)");
      params.push(query.projectId.trim());
    }

    if (query.channel?.trim()) {
      conditions.push("channel = ?");
      params.push(query.channel.trim());
    }

    if (query.keyword?.trim()) {
      conditions.push("(title LIKE ? OR version LIKE ? OR notes LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM releases ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT * FROM releases
          ${whereClause}
          ORDER BY published_at DESC, updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as ReleaseRow[];

    return {
      items: rows.map((row) => this.mapRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  listRecentPublishedForNotifications(projectIds: string[], limit: number): ReleaseEntity[] {
    const conditions: string[] = ["status = 'published'"];
    const params: unknown[] = [];

    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(", ");
      conditions.push(`(project_id IS NULL OR project_id IN (${placeholders}))`);
      params.push(...projectIds);
    } else {
      conditions.push("project_id IS NULL");
    }

    const rows = this.db
      .prepare(
        `
          SELECT * FROM releases
          WHERE ${conditions.join(" AND ")}
          ORDER BY published_at DESC, updated_at DESC
          LIMIT ?
        `
      )
      .all(...params, limit) as ReleaseRow[];

    return rows.map((row) => this.mapRow(row));
  }

  listRecentArchivedForNotifications(projectIds: string[], limit: number): ReleaseEntity[] {
    const conditions: string[] = ["status = 'archived'"];
    const params: unknown[] = [];

    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(", ");
      conditions.push(`(project_id IS NULL OR project_id IN (${placeholders}))`);
      params.push(...projectIds);
    } else {
      conditions.push("project_id IS NULL");
    }

    const rows = this.db
      .prepare(
        `
          SELECT * FROM releases
          WHERE ${conditions.join(" AND ")}
          ORDER BY updated_at DESC
          LIMIT ?
        `
      )
      .all(...params, limit) as ReleaseRow[];

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: ReleaseRow): ReleaseEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      channel: row.channel,
      version: row.version,
      title: row.title,
      notes: row.notes,
      downloadUrl: row.download_url,
      syncToProjectVersion: row.sync_project_version === 1,
      status: row.status,
      publishedAt: row.published_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
