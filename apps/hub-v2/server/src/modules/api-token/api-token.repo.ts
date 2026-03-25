import type Database from "better-sqlite3";
import type { ApiTokenScope, ApiTokenStatus, ProjectApiTokenEntity } from "./api-token.types";

type ProjectApiTokenRow = {
  id: string;
  project_id: string;
  owner_user_id: string;
  name: string;
  token_prefix: string;
  token_hash: string;
  scopes_json: string;
  status: ApiTokenStatus;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export class ApiTokenRepo {
  constructor(private readonly db: Database.Database) {}

  create(input: {
    id: string;
    projectId: string;
    ownerUserId: string;
    name: string;
    tokenPrefix: string;
    tokenHash: string;
    scopes: ApiTokenScope[];
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
  }): void {
    this.db
      .prepare(
        `
          INSERT INTO project_api_tokens (
            id, project_id, owner_user_id, name, token_prefix, token_hash, scopes_json, status, expires_at, last_used_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NULL, ?, ?)
        `
      )
      .run(
        input.id,
        input.projectId,
        input.ownerUserId,
        input.name,
        input.tokenPrefix,
        input.tokenHash,
        JSON.stringify(input.scopes),
        input.expiresAt,
        input.createdAt,
        input.updatedAt
      );
  }

  listByProject(projectId: string): ProjectApiTokenEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM project_api_tokens
          WHERE project_id = ?
          ORDER BY created_at DESC
        `
      )
      .all(projectId) as ProjectApiTokenRow[];
    return rows.map((row) => this.mapEntity(row));
  }

  findById(id: string): (ProjectApiTokenEntity & { tokenHash: string }) | null {
    const row = this.db.prepare("SELECT * FROM project_api_tokens WHERE id = ?").get(id) as ProjectApiTokenRow | undefined;
    if (!row) {
      return null;
    }
    return {
      ...this.mapEntity(row),
      tokenHash: row.token_hash
    };
  }

  findByPrefix(tokenPrefix: string): (ProjectApiTokenEntity & { tokenHash: string }) | null {
    const row = this.db
      .prepare("SELECT * FROM project_api_tokens WHERE token_prefix = ? LIMIT 1")
      .get(tokenPrefix) as ProjectApiTokenRow | undefined;
    if (!row) {
      return null;
    }
    return {
      ...this.mapEntity(row),
      tokenHash: row.token_hash
    };
  }

  updateStatus(id: string, status: ApiTokenStatus, updatedAt: string): boolean {
    const result = this.db
      .prepare("UPDATE project_api_tokens SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, updatedAt, id);
    return result.changes > 0;
  }

  touchLastUsed(id: string, now: string): void {
    this.db
      .prepare("UPDATE project_api_tokens SET last_used_at = ?, updated_at = ? WHERE id = ?")
      .run(now, now, id);
  }

  private mapEntity(row: ProjectApiTokenRow): ProjectApiTokenEntity {
    let scopes: ApiTokenScope[] = [];
    try {
      const parsed = JSON.parse(row.scopes_json) as unknown;
      if (Array.isArray(parsed)) {
        scopes = parsed.filter((item): item is ApiTokenScope => typeof item === "string") as ApiTokenScope[];
      }
    } catch {
      scopes = [];
    }

    return {
      id: row.id,
      projectId: row.project_id,
      ownerUserId: row.owner_user_id,
      name: row.name,
      tokenPrefix: row.token_prefix,
      scopes,
      status: row.status,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
