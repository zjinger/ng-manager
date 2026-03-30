import type Database from "better-sqlite3";
import type { ContentLogAction, ContentLogEntity } from "./content-log.types";

type ContentLogRow = {
  id: string;
  project_id: string | null;
  content_type: "announcement" | "document" | "release";
  content_id: string;
  action_type: "created" | "updated" | "published" | "archived";
  title: string;
  summary: string | null;
  operator_id: string | null;
  operator_name: string | null;
  meta_json: string | null;
  created_at: string;
};

export class ContentLogRepo {
  constructor(private readonly db: Database.Database) {}

  create(entry: ContentLogEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO content_logs (
            id, project_id, content_type, content_id, action_type, title,
            summary, operator_id, operator_name, meta_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entry.id,
        entry.projectId,
        entry.contentType,
        entry.contentId,
        entry.actionType,
        entry.title,
        entry.summary,
        entry.operatorId,
        entry.operatorName,
        entry.metaJson,
        entry.createdAt
      );
  }

  listRecent(projectIds: string[], limit: number, actions?: ContentLogAction[]): ContentLogEntity[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(", ");
      conditions.push(`(project_id IS NULL OR project_id IN (${placeholders}))`);
      params.push(...projectIds);
    } else {
      conditions.push("project_id IS NULL");
    }

    if (actions && actions.length > 0) {
      const placeholders = actions.map(() => "?").join(", ");
      conditions.push(`action_type IN (${placeholders})`);
      params.push(...actions);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM content_logs
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT ?
        `
      )
      .all(...params, limit) as ContentLogRow[];

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: ContentLogRow): ContentLogEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      contentType: row.content_type,
      contentId: row.content_id,
      actionType: row.action_type,
      title: row.title,
      summary: row.summary,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      metaJson: row.meta_json,
      createdAt: row.created_at
    };
  }
}

