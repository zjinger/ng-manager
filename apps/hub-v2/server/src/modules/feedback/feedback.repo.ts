import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type { FeedbackEntity, FeedbackListResult, ListFeedbacksQuery } from "./feedback.types";

type FeedbackRow = {
  id: string;
  source: string;
  category: string;
  title: string;
  content: string;
  contact: string | null;
  client_name: string | null;
  client_version: string | null;
  client_ip: string | null;
  os_info: string | null;
  project_key: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export class FeedbackRepo {
  constructor(private readonly db: Database.Database) {}

  findById(id: string): FeedbackEntity | null {
    const row = this.db.prepare("SELECT * FROM feedbacks WHERE id = ?").get(id) as FeedbackRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  list(query: ListFeedbacksQuery): FeedbackListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status?.trim()) {
      conditions.push("status = ?");
      params.push(query.status.trim());
    }

    if (query.category?.trim()) {
      conditions.push("category = ?");
      params.push(query.category.trim());
    }

    if (query.source?.trim()) {
      conditions.push("source = ?");
      params.push(query.source.trim());
    }

    if (query.keyword?.trim()) {
      conditions.push(
        "(title LIKE ? OR content LIKE ? OR contact LIKE ? OR project_key LIKE ? OR client_name LIKE ?)"
      );
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword, keyword, keyword);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM feedbacks ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT * FROM feedbacks
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as FeedbackRow[];

    return {
      items: rows.map((row) => this.mapRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  private mapRow(row: FeedbackRow): FeedbackEntity {
    return {
      id: row.id,
      source: row.source,
      category: row.category,
      title: row.title,
      content: row.content,
      contact: row.contact,
      clientName: row.client_name,
      clientVersion: row.client_version,
      clientIp: row.client_ip,
      osInfo: row.os_info,
      projectKey: row.project_key,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
