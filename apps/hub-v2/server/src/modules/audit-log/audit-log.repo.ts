import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type { AuditLogEntity, AuditLogListResult, ListAuditLogsQuery } from "./audit-log.types";

type AuditLogRow = {
  id: string;
  module: AuditLogEntity["module"];
  action: AuditLogEntity["action"];
  level: AuditLogEntity["level"];
  actor_id: string | null;
  actor_name: string | null;
  actor_user_id: string | null;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  summary: string;
  ip: string | null;
  user_agent: string | null;
  request_id: string | null;
  before_json: string | null;
  after_json: string | null;
  meta_json: string | null;
  created_at: string;
};

export class AuditLogRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: AuditLogEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO admin_audit_logs (
            id, module, action, level, actor_id, actor_name, actor_user_id,
            target_type, target_id, target_name, summary, ip, user_agent,
            request_id, before_json, after_json, meta_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.module,
        entity.action,
        entity.level,
        entity.actorId,
        entity.actorName,
        entity.actorUserId,
        entity.targetType,
        entity.targetId,
        entity.targetName,
        entity.summary,
        entity.ip,
        entity.userAgent,
        entity.requestId,
        entity.beforeJson,
        entity.afterJson,
        entity.metaJson,
        entity.createdAt
      );
  }

  list(query: ListAuditLogsQuery): AuditLogListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.module) {
      conditions.push("module = ?");
      params.push(query.module);
    }
    if (query.action) {
      conditions.push("action = ?");
      params.push(query.action);
    }
    if (query.level) {
      conditions.push("level = ?");
      params.push(query.level);
    }
    if (query.actorId?.trim()) {
      conditions.push("(actor_id = ? OR actor_user_id = ?)");
      params.push(query.actorId.trim(), query.actorId.trim());
    }
    if (query.dateFrom?.trim()) {
      conditions.push("created_at >= ?");
      params.push(query.dateFrom.trim());
    }
    if (query.dateTo?.trim()) {
      conditions.push("created_at <= ?");
      params.push(query.dateTo.trim());
    }
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      conditions.push(
        "(summary LIKE ? OR actor_name LIKE ? OR target_name LIKE ? OR target_id LIKE ? OR ip LIKE ? OR request_id LIKE ?)"
      );
      params.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM admin_audit_logs ${whereClause}`)
      .get(...params) as { total: number };
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM admin_audit_logs
          ${whereClause}
          ORDER BY created_at DESC, id DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as AuditLogRow[];

    return {
      items: rows.map((row) => this.mapRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  private mapRow(row: AuditLogRow): AuditLogEntity {
    return {
      id: row.id,
      module: row.module,
      action: row.action,
      level: row.level,
      actorId: row.actor_id,
      actorName: row.actor_name,
      actorUserId: row.actor_user_id,
      targetType: row.target_type,
      targetId: row.target_id,
      targetName: row.target_name,
      summary: row.summary,
      ip: row.ip,
      userAgent: row.user_agent,
      requestId: row.request_id,
      beforeJson: row.before_json,
      afterJson: row.after_json,
      metaJson: row.meta_json,
      createdAt: row.created_at
    };
  }
}
