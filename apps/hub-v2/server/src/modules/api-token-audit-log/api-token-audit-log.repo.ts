import type Database from "better-sqlite3";
import type { ApiTokenAuditLogEntity } from "./api-token-audit-log.types";

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
}
