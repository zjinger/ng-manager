import type Database from "better-sqlite3";
import type { AdminAccountEntity } from "./auth.types";

type AdminAccountRow = {
  id: string;
  user_id: string | null;
  username: string;
  password_hash: string;
  nickname: string;
  role: "admin" | "user";
  status: "active" | "inactive";
  must_change_password: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export class AuthRepo {
  constructor(private readonly db: Database.Database) {}

  findByUsername(username: string): AdminAccountEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            user_id,
            username,
            password_hash,
            nickname,
            role,
            status,
            must_change_password,
            last_login_at,
            created_at,
            updated_at
          FROM admin_accounts
          WHERE username = ?
        `
      )
      .get(username) as AdminAccountRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  findById(id: string): AdminAccountEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            user_id,
            username,
            password_hash,
            nickname,
            role,
            status,
            must_change_password,
            last_login_at,
            created_at,
            updated_at
          FROM admin_accounts
          WHERE id = ?
        `
      )
      .get(id) as AdminAccountRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  create(account: AdminAccountEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO admin_accounts (
            id,
            user_id,
            username,
            password_hash,
            nickname,
            role,
            status,
            must_change_password,
            last_login_at,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        account.id,
        account.userId ?? null,
        account.username,
        account.passwordHash,
        account.nickname,
        account.role,
        account.status,
        account.mustChangePassword ? 1 : 0,
        account.lastLoginAt ?? null,
        account.createdAt,
        account.updatedAt
      );
  }

  updateLastLogin(id: string, lastLoginAt: string): void {
    this.db
      .prepare(
        `
          UPDATE admin_accounts
          SET last_login_at = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(lastLoginAt, lastLoginAt, id);
  }

  updatePassword(id: string, passwordHash: string, updatedAt: string): void {
    this.db
      .prepare(
        `
          UPDATE admin_accounts
          SET password_hash = ?, must_change_password = 0, updated_at = ?
          WHERE id = ?
        `
      )
      .run(passwordHash, updatedAt, id);
  }

  private mapRow(row: AdminAccountRow): AdminAccountEntity {
    return {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      passwordHash: row.password_hash,
      nickname: row.nickname,
      role: row.role,
      status: row.status,
      mustChangePassword: row.must_change_password === 1,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
