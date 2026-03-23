import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type { ListUsersQuery, UpdateUserInput, UserEntity, UserListResult } from "./user.types";

type UserRow = {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  mobile: string | null;
  title_code: string | null;
  status: "active" | "inactive";
  source: "local" | "imported";
  remark: string | null;
  created_at: string;
  updated_at: string;
};

export class UserRepo {
  constructor(private readonly db: Database.Database) {}

  findById(id: string): UserEntity | null {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findByUsername(username: string): UserEntity | null {
    const row = this.db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as UserRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  create(entity: UserEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO users (
          id, username, display_name, email, mobile, title_code, status, source, remark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.username,
        entity.displayName,
        entity.email,
        entity.mobile,
        entity.titleCode,
        entity.status,
        entity.source,
        entity.remark,
        entity.createdAt,
        entity.updatedAt
      );
  }

  update(id: string, input: UpdateUserInput, updatedAt: string): void {
    this.db
      .prepare(
        `
        UPDATE users
        SET
          display_name = ?,
          email = ?,
          mobile = ?,
          title_code = ?,
          status = ?,
          remark = ?,
          updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        input.displayName ?? null,
        input.email ?? null,
        input.mobile ?? null,
        input.titleCode ?? null,
        input.status ?? "active",
        input.remark ?? null,
        updatedAt,
        id
      );
  }

  list(query: ListUsersQuery): UserListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }

    if (query.keyword?.trim()) {
      conditions.push("(username LIKE ? OR display_name LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM users ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT * FROM users
          ${whereClause}
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as UserRow[];

    return {
      items: rows.map((row) => this.mapRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  private mapRow(row: UserRow): UserEntity {
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      email: row.email,
      mobile: row.mobile,
      titleCode: row.title_code,
      status: row.status,
      source: row.source,
      remark: row.remark,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
