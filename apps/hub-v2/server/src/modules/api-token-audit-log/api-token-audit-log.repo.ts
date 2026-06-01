import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  ApiTokenAuditLogEntity,
  ApiTokenAuditLogListItem,
  ApiTokenAuditLogListResult,
  ListPersonalApiTokenAuditLogsQuery
} from "./api-token-audit-log.types";

type ApiTokenAuditLogListRow = {
  id: string;
  token_type: ApiTokenAuditLogEntity["tokenType"];
  token_id: string;
  token_name: string | null;
  token_prefix: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  project_key: string | null;
  ip: string | null;
  user_agent: string | null;
  metadata_json: string | null;
  created_at: string;
};

export class ApiTokenAuditLogRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: ApiTokenAuditLogEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO api_token_audit_logs (
            id, token_type, token_id, actor_user_id, project_id, project_key,
            action, resource_type, resource_id, ip, user_agent, metadata_json,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.tokenType,
        entity.tokenId,
        entity.actorUserId,
        entity.projectId,
        entity.projectKey,
        entity.action,
        entity.resourceType,
        entity.resourceId,
        entity.ip,
        entity.userAgent,
        entity.metadataJson,
        entity.createdAt
      );
  }

  listPersonalByActor(actorUserId: string, query: ListPersonalApiTokenAuditLogsQuery): ApiTokenAuditLogListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions = ["l.token_type = 'personal'", "l.actor_user_id = ?"];
    const params: unknown[] = [actorUserId];

    if (query.tokenId?.trim()) {
      conditions.push("l.token_id = ?");
      params.push(query.tokenId.trim());
    }
    if (query.action?.trim()) {
      conditions.push("l.action = ?");
      params.push(query.action.trim());
    }
    if (query.projectKey?.trim()) {
      conditions.push("l.project_key = ?");
      params.push(query.projectKey.trim());
    }
    if (query.dateFrom?.trim()) {
      conditions.push("l.created_at >= ?");
      params.push(query.dateFrom.trim());
    }
    if (query.dateTo?.trim()) {
      conditions.push("l.created_at <= ?");
      params.push(query.dateTo.trim());
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM api_token_audit_logs l ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT
            l.id,
            l.token_type,
            l.token_id,
            t.name AS token_name,
            t.token_prefix,
            l.action,
            l.resource_type,
            l.resource_id,
            l.project_key,
            l.ip,
            l.user_agent,
            l.metadata_json,
            l.created_at
          FROM api_token_audit_logs l
          LEFT JOIN personal_api_tokens t
            ON t.id = l.token_id
            AND t.owner_user_id = l.actor_user_id
          ${whereClause}
          ORDER BY l.created_at DESC, l.id DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as ApiTokenAuditLogListRow[];

    return {
      items: rows.map((row) => this.mapListRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  private mapListRow(row: ApiTokenAuditLogListRow): ApiTokenAuditLogListItem {
    const metadata = this.parseMetadata(row.metadata_json);
    return {
      id: row.id,
      tokenType: row.token_type,
      tokenId: row.token_id,
      tokenName: row.token_name,
      tokenPrefix: row.token_prefix ?? this.metadataTokenPrefix(metadata),
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      projectKey: row.project_key,
      ip: row.ip,
      userAgent: row.user_agent,
      metadata,
      createdAt: row.created_at
    };
  }

  private parseMetadata(value: string | null): unknown {
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }

  private metadataTokenPrefix(metadata: unknown): string | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return null;
    }
    const tokenPrefix = (metadata as { tokenPrefix?: unknown }).tokenPrefix;
    return typeof tokenPrefix === "string" && tokenPrefix.trim() ? tokenPrefix.trim() : null;
  }
}
