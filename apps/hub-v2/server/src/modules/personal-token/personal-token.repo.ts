import type Database from "better-sqlite3";
import type { PersonalApiTokenEntity, PersonalTokenScope, PersonalTokenStatus } from "./personal-token.types";

type PersonalApiTokenRow = {
  id: string;
  owner_user_id: string;
  name: string;
  token_prefix: string;
  token_hash: string;
  scopes_json: string;
  status: PersonalTokenStatus;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export class PersonalTokenRepo {
  constructor(private readonly db: Database.Database) {}

  create(input: {
    id: string;
    ownerUserId: string;
    name: string;
    tokenPrefix: string;
    tokenHash: string;
    scopes: PersonalTokenScope[];
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO personal_api_tokens (
          id, owner_user_id, name, token_prefix, token_hash, scopes_json, status, expires_at, last_used_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, NULL, ?, ?)
      `
      )
      .run(
        input.id,
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

  listByOwner(ownerUserId: string): PersonalApiTokenEntity[] {
    const rows = this.db
      .prepare(
        `
        SELECT * FROM personal_api_tokens
        WHERE owner_user_id = ?
        ORDER BY created_at DESC
      `
      )
      .all(ownerUserId) as PersonalApiTokenRow[];
    return rows.map((row) => this.mapEntity(row));
  }

  findById(id: string): (PersonalApiTokenEntity & { tokenHash: string }) | null {
    const row = this.db
      .prepare("SELECT * FROM personal_api_tokens WHERE id = ? LIMIT 1")
      .get(id) as PersonalApiTokenRow | undefined;
    if (!row) return null;
    return { ...this.mapEntity(row), tokenHash: row.token_hash };
  }

  findByPrefix(tokenPrefix: string): (PersonalApiTokenEntity & { tokenHash: string }) | null {
    const row = this.db
      .prepare("SELECT * FROM personal_api_tokens WHERE token_prefix = ? LIMIT 1")
      .get(tokenPrefix) as PersonalApiTokenRow | undefined;
    if (!row) return null;
    return { ...this.mapEntity(row), tokenHash: row.token_hash };
  }

  updateStatus(id: string, status: PersonalTokenStatus, updatedAt: string): boolean {
    const result = this.db
      .prepare("UPDATE personal_api_tokens SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, updatedAt, id);
    return result.changes > 0;
  }

  touchLastUsed(id: string, now: string): void {
    this.db
      .prepare("UPDATE personal_api_tokens SET last_used_at = ?, updated_at = ? WHERE id = ?")
      .run(now, now, id);
  }

  private mapEntity(row: PersonalApiTokenRow): PersonalApiTokenEntity {
    let scopes: PersonalTokenScope[] = [];
    try {
      const parsed = JSON.parse(row.scopes_json) as unknown;
      if (Array.isArray(parsed)) {
        scopes = parsed.filter((item): item is PersonalTokenScope => typeof item === "string") as PersonalTokenScope[];
      }
    } catch {
      scopes = [];
    }

    return {
      id: row.id,
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
