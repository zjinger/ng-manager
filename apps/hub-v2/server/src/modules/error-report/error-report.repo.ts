import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  ClientErrorReportEntity,
  ClientErrorReportListQuery,
  ClientErrorReportListResult
} from "./error-report.types";

type ClientErrorReportRow = {
  id: string;
  level: ClientErrorReportEntity["level"];
  type: string;
  message: string;
  stack: string | null;
  source: string | null;
  lineno: number | null;
  colno: number | null;
  url: string | null;
  route: string | null;
  user_agent: string | null;
  ip: string | null;
  app_version: string | null;
  build_hash: string | null;
  user_id: string | null;
  username: string | null;
  request_method: string | null;
  request_url: string | null;
  status_code: number | null;
  extra_json: string | null;
  fingerprint: string;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
};

export class ErrorReportRepo {
  constructor(private readonly db: Database.Database) {}

  createOrUpdate(entity: ClientErrorReportEntity): ClientErrorReportEntity {
    return this.db.transaction(() => {
      const existing = this.db
        .prepare("SELECT id, occurrence_count, first_seen_at, created_at FROM client_error_reports WHERE fingerprint = ?")
        .get(entity.fingerprint) as
        | { id: string; occurrence_count: number; first_seen_at: string; created_at: string }
        | undefined;

      if (existing) {
        this.db
          .prepare(
            `
              UPDATE client_error_reports
              SET level = ?,
                  type = ?,
                  message = ?,
                  stack = ?,
                  source = ?,
                  lineno = ?,
                  colno = ?,
                  url = ?,
                  route = ?,
                  user_agent = ?,
                  ip = ?,
                  app_version = ?,
                  build_hash = ?,
                  user_id = ?,
                  username = ?,
                  request_method = ?,
                  request_url = ?,
                  status_code = ?,
                  extra_json = ?,
                  occurrence_count = occurrence_count + 1,
                  last_seen_at = ?
              WHERE fingerprint = ?
            `
          )
          .run(
            entity.level,
            entity.type,
            entity.message,
            entity.stack,
            entity.source,
            entity.lineno,
            entity.colno,
            entity.url,
            entity.route,
            entity.userAgent,
            entity.ip,
            entity.appVersion,
            entity.buildHash,
            entity.userId,
            entity.username,
            entity.requestMethod,
            entity.requestUrl,
            entity.statusCode,
            entity.extraJson,
            entity.lastSeenAt,
            entity.fingerprint
          );

        const updated = this.getById(existing.id);
        if (!updated) {
          throw new Error(`client error report disappeared after update: ${existing.id}`);
        }
        return updated;
      }

      this.db
        .prepare(
          `
            INSERT INTO client_error_reports (
              id, level, type, message, stack, source, lineno, colno, url, route,
              user_agent, ip, app_version, build_hash, user_id, username,
              request_method, request_url, status_code, extra_json, fingerprint,
              occurrence_count, first_seen_at, last_seen_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .run(
          entity.id,
          entity.level,
          entity.type,
          entity.message,
          entity.stack,
          entity.source,
          entity.lineno,
          entity.colno,
          entity.url,
          entity.route,
          entity.userAgent,
          entity.ip,
          entity.appVersion,
          entity.buildHash,
          entity.userId,
          entity.username,
          entity.requestMethod,
          entity.requestUrl,
          entity.statusCode,
          entity.extraJson,
          entity.fingerprint,
          entity.occurrenceCount,
          entity.firstSeenAt,
          entity.lastSeenAt,
          entity.createdAt
        );

      return entity;
    })();
  }

  list(query: ClientErrorReportListQuery): ClientErrorReportListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.level) {
      conditions.push("level = ?");
      params.push(query.level);
    }
    if (query.type?.trim()) {
      conditions.push("type = ?");
      params.push(query.type.trim());
    }
    if (query.dateFrom?.trim()) {
      conditions.push("last_seen_at >= ?");
      params.push(query.dateFrom.trim());
    }
    if (query.dateTo?.trim()) {
      conditions.push("last_seen_at <= ?");
      params.push(query.dateTo.trim());
    }
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      conditions.push(
        "(message LIKE ? OR stack LIKE ? OR source LIKE ? OR route LIKE ? OR url LIKE ? OR request_url LIKE ? OR username LIKE ? OR user_agent LIKE ? OR fingerprint LIKE ?)"
      );
      params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM client_error_reports ${whereClause}`)
      .get(...params) as { total: number };
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM client_error_reports
          ${whereClause}
          ORDER BY last_seen_at DESC, id DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as ClientErrorReportRow[];

    return {
      items: rows.map((row) => this.mapRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  getById(id: string): ClientErrorReportEntity | null {
    const row = this.db
      .prepare("SELECT * FROM client_error_reports WHERE id = ?")
      .get(id) as ClientErrorReportRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: ClientErrorReportRow): ClientErrorReportEntity {
    return {
      id: row.id,
      level: row.level,
      type: row.type,
      message: row.message,
      stack: row.stack,
      source: row.source,
      lineno: row.lineno,
      colno: row.colno,
      url: row.url,
      route: row.route,
      userAgent: row.user_agent,
      ip: row.ip,
      appVersion: row.app_version,
      buildHash: row.build_hash,
      userId: row.user_id,
      username: row.username,
      requestMethod: row.request_method,
      requestUrl: row.request_url,
      statusCode: row.status_code,
      extraJson: row.extra_json,
      fingerprint: row.fingerprint,
      occurrenceCount: row.occurrence_count,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      createdAt: row.created_at
    };
  }
}
