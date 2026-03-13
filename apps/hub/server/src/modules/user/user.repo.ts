import type Database from "better-sqlite3";
import type { ListUserQuery, UpdateUserInput, UserEntity, UserListResult } from "./user.types";

type UserRow = {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  mobile: string | null;
  title_code: string | null;
  status: string;
  source: string;
  remark: string | null;
  login_account_status: string | null;
  login_account_username: string | null;
  created_at: string;
  updated_at: string;
};

export class UserRepo {
  private readonly titleColumn: "title_code" | "title";

  constructor(private readonly db: Database.Database) {
    this.titleColumn = this.detectTitleColumn();
  }

  runInTransaction<T>(operation: () => T): T {
    const tx = this.db.transaction(operation);
    return tx();
  }

  create(entity: UserEntity): void {
    this.db.prepare(`
      INSERT INTO users (
        id, username, display_name, email, mobile, ${this.titleColumn}, status, source, remark, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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

  findById(id: string): UserEntity | null {
    const row = this.db.prepare(`
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.email,
        u.mobile,
        u.${this.titleColumn} AS title_code,
        u.status,
        u.source,
        u.remark,
        au.status AS login_account_status,
        au.username AS login_account_username,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN admin_users au ON au.user_id = u.id
      WHERE u.id = ?
    `).get(id) as UserRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  findByUsername(username: string): UserEntity | null {
    const row = this.db.prepare(`
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.email,
        u.mobile,
        u.${this.titleColumn} AS title_code,
        u.status,
        u.source,
        u.remark,
        au.status AS login_account_status,
        au.username AS login_account_username,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN admin_users au ON au.user_id = u.id
      WHERE lower(u.username) = lower(?)
      LIMIT 1
    `).get(username) as UserRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  update(id: string, patch: UpdateUserInput & { updatedAt: string }): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.username !== undefined) {
      fields.push("username = ?");
      params.push(patch.username);
    }
    if (patch.displayName !== undefined) {
      fields.push("display_name = ?");
      params.push(patch.displayName);
    }
    if (patch.email !== undefined) {
      fields.push("email = ?");
      params.push(patch.email);
    }
    if (patch.mobile !== undefined) {
      fields.push("mobile = ?");
      params.push(patch.mobile);
    }
    if (patch.titleCode !== undefined) {
      fields.push(`${this.titleColumn} = ?`);
      params.push(patch.titleCode);
    }
    if (patch.status !== undefined) {
      fields.push("status = ?");
      params.push(patch.status);
    }
    if (patch.source !== undefined) {
      fields.push("source = ?");
      params.push(patch.source);
    }
    if (patch.remark !== undefined) {
      fields.push("remark = ?");
      params.push(patch.remark);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);
    params.push(id);

    const result = this.db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...params);
    return result.changes > 0;
  }

  list(query: ListUserQuery): UserListResult {
    const where: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      where.push("u.status = ?");
      params.push(query.status);
    }

    if (query.keyword) {
      where.push("(u.username LIKE ? OR u.display_name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)");
      const keyword = `%${query.keyword}%`;
      params.push(keyword, keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (query.page - 1) * query.pageSize;

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM users u ${whereSql}`)
      .get(...params) as { total: number };

    const rows = this.db.prepare(`
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.email,
        u.mobile,
        u.${this.titleColumn} AS title_code,
        u.status,
        u.source,
        u.remark,
        au.status AS login_account_status,
        au.username AS login_account_username,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN admin_users au ON au.user_id = u.id
      ${whereSql}
      ORDER BY u.updated_at DESC, u.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, query.pageSize, offset) as UserRow[];

    return {
      items: rows.map((row) => this.toEntity(row)),
      page: query.page,
      pageSize: query.pageSize,
      total: totalRow.total
    };
  }

  private detectTitleColumn(): "title_code" | "title" {
    const rows = this.db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
    const names = new Set(rows.map((row) => row.name));
    if (names.has("title_code")) {
      return "title_code";
    }
    return "title";
  }

  private toEntity(row: UserRow): UserEntity {
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      email: row.email,
      mobile: row.mobile,
      titleCode: row.title_code as UserEntity["titleCode"],
      status: row.status as UserEntity["status"],
      source: row.source as UserEntity["source"],
      remark: row.remark,
      loginAccountStatus: (row.login_account_status as UserEntity["loginAccountStatus"]) ?? null,
      loginAccountUsername: row.login_account_username,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
