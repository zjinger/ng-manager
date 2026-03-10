import type Database from "better-sqlite3";
import type {
  FeedbackEntity,
  FeedbackListResult,
  ListFeedbackQuery,
  UpdateFeedbackStatusInput
} from "./feedback.types";

type FeedbackRow = {
  id: string;
  project_key: string | null;
  source: string;
  category: string;
  title: string;
  content: string;
  contact: string | null;
  client_name: string | null;
  client_version: string | null;
  os_info: string | null;
  client_ip: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export class FeedbackRepo {
  constructor(private readonly db: Database.Database) {}

  create(input: FeedbackEntity): void {
    const stmt = this.db.prepare(`
      INSERT INTO feedbacks (
        id, project_key, source, category, title, content, contact,
        client_name, client_version, os_info, client_ip, status, created_at, updated_at
      ) VALUES (
        @id, @project_key, @source, @category, @title, @content, @contact,
        @client_name, @client_version, @os_info, @client_ip, @status, @created_at, @updated_at
      )
    `);

    stmt.run({
      id: input.id,
      project_key: input.projectKey ?? null,
      source: input.source,
      category: input.category,
      title: input.title,
      content: input.content,
      contact: input.contact ?? null,
      client_name: input.clientName ?? null,
      client_version: input.clientVersion ?? null,
      os_info: input.osInfo ?? null,
      client_ip: input.clientIp ?? null,
      status: input.status,
      created_at: input.createdAt,
      updated_at: input.updatedAt
    });
  }

  findById(id: string): FeedbackEntity | null {
    const row = this.db
      .prepare(`SELECT * FROM feedbacks WHERE id = ?`)
      .get(id) as FeedbackRow | undefined;

    return row ? this.toEntity(row) : null;
  }

  updateStatus(id: string, input: UpdateFeedbackStatusInput, updatedAt: string): boolean {
    const result = this.db
      .prepare(`UPDATE feedbacks SET status = ?, updated_at = ? WHERE id = ?`)
      .run(input.status, updatedAt, id);

    return result.changes > 0;
  }

  list(query: ListFeedbackQuery): FeedbackListResult {
    const where: string[] = [];
    const params: unknown[] = [];

    if (query.projectKey) {
      where.push("project_key = ?");
      params.push(query.projectKey);
    }

    if (query.status) {
      where.push("status = ?");
      params.push(query.status);
    }

    if (query.category) {
      where.push("category = ?");
      params.push(query.category);
    }

    if (query.keyword) {
      where.push("(title LIKE ? OR content LIKE ?)");
      params.push(`%${query.keyword}%`, `%${query.keyword}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (query.page - 1) * query.pageSize;

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM feedbacks ${whereSql}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(`
        SELECT *
        FROM feedbacks
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, query.pageSize, offset) as FeedbackRow[];

    return {
      items: rows.map((row) => this.toEntity(row)),
      page: query.page,
      pageSize: query.pageSize,
      total: totalRow.total
    };
  }

  private toEntity(row: FeedbackRow): FeedbackEntity {
    return {
      id: row.id,
      projectKey: row.project_key,
      source: row.source as FeedbackEntity["source"],
      category: row.category as FeedbackEntity["category"],
      title: row.title,
      content: row.content,
      contact: row.contact,
      clientName: row.client_name,
      clientVersion: row.client_version,
      osInfo: row.os_info,
      clientIp: row.client_ip,
      status: row.status as FeedbackEntity["status"],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
