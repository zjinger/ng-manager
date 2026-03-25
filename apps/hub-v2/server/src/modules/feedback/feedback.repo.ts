import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  FeedbackCategory,
  FeedbackEntity,
  FeedbackListResult,
  FeedbackSource,
  FeedbackStatus,
  ListFeedbacksQuery,
  UpdateFeedbackStatusInput
} from "./feedback.types";

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

  create(input: FeedbackEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO feedbacks (
          id, source, category, title, content, contact,
          client_name, client_version, client_ip, os_info,
          project_key, status, created_at, updated_at
        ) VALUES (
          @id, @source, @category, @title, @content, @contact,
          @client_name, @client_version, @client_ip, @os_info,
          @project_key, @status, @created_at, @updated_at
        )
      `
      )
      .run({
        id: input.id,
        source: input.source,
        category: input.category,
        title: input.title,
        content: input.content,
        contact: input.contact ?? null,
        client_name: input.clientName ?? null,
        client_version: input.clientVersion ?? null,
        client_ip: input.clientIp ?? null,
        os_info: input.osInfo ?? null,
        project_key: input.projectKey ?? null,
        status: input.status,
        created_at: input.createdAt,
        updated_at: input.updatedAt
      });
  }

  findById(id: string): FeedbackEntity | null {
    const row = this.db.prepare("SELECT * FROM feedbacks WHERE id = ?").get(id) as FeedbackRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  updateStatus(id: string, input: UpdateFeedbackStatusInput, updatedAt: string): boolean {
    const result = this.db.prepare("UPDATE feedbacks SET status = ?, updated_at = ? WHERE id = ?").run(
      input.status,
      updatedAt,
      id
    );
    return result.changes > 0;
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

    if (query.projectKey?.trim()) {
      conditions.push("project_key = ?");
      params.push(query.projectKey.trim());
    }
    if (query.projectKeys?.length) {
      const keys = query.projectKeys.filter((item) => item.trim().length > 0);
      if (keys.length === 0) {
        return {
          items: [],
          page,
          pageSize,
          total: 0
        };
      }
      conditions.push(`project_key IN (${keys.map(() => "?").join(",")})`);
      params.push(...keys);
    }

    if (query.keyword?.trim()) {
      conditions.push(
        "(title LIKE ? OR content LIKE ? OR contact LIKE ? OR client_name LIKE ?)"
      );
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword, keyword);
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
      source: row.source as FeedbackSource,
      category: row.category as FeedbackCategory,
      title: row.title,
      content: row.content,
      contact: row.contact,
      clientName: row.client_name,
      clientVersion: row.client_version,
      clientIp: row.client_ip,
      osInfo: row.os_info,
      projectKey: row.project_key,
      status: row.status as FeedbackStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
