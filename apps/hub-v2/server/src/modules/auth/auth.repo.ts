import type Database from "better-sqlite3";
import type { AdminAccountEntity } from "./auth.types";

type AdminAccountRow = {
  id: string;
  user_id: string | null;
  username: string;
  email: string | null;
  mobile: string | null;
  remark: string | null;
  password_hash: string;
  nickname: string;
  avatar_upload_id?: string | null;
  role: "admin" | "user";
  status: "active" | "inactive";
  must_change_password: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export class AuthRepo {
  private readonly hasAvatarUploadColumn: boolean;

  constructor(private readonly db: Database.Database) {
    this.hasAvatarUploadColumn = this.detectAvatarUploadColumn();
  }

  findByUsername(username: string): AdminAccountEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT
            a.id,
            a.user_id,
            a.username,
            u.email,
            u.mobile,
            u.remark,
            a.password_hash,
            a.nickname,
            ${this.hasAvatarUploadColumn ? "a.avatar_upload_id," : ""}
            a.role,
            a.status,
            a.must_change_password,
            a.last_login_at,
            a.created_at,
            a.updated_at
          FROM admin_accounts a
          LEFT JOIN users u ON u.id = a.user_id
          WHERE a.username = ? COLLATE NOCASE
          LIMIT 1
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
            a.id,
            a.user_id,
            a.username,
            u.email,
            u.mobile,
            u.remark,
            a.password_hash,
            a.nickname,
            ${this.hasAvatarUploadColumn ? "a.avatar_upload_id," : ""}
            a.role,
            a.status,
            a.must_change_password,
            a.last_login_at,
            a.created_at,
            a.updated_at
          FROM admin_accounts a
          LEFT JOIN users u ON u.id = a.user_id
          WHERE a.id = ?
        `
      )
      .get(id) as AdminAccountRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  findByUserId(userId: string): AdminAccountEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT
            a.id,
            a.user_id,
            a.username,
            u.email,
            u.mobile,
            u.remark,
            a.password_hash,
            a.nickname,
            ${this.hasAvatarUploadColumn ? "a.avatar_upload_id," : ""}
            a.role,
            a.status,
            a.must_change_password,
            a.last_login_at,
            a.created_at,
            a.updated_at
          FROM admin_accounts a
          LEFT JOIN users u ON u.id = a.user_id
          WHERE a.user_id = ?
          LIMIT 1
        `
      )
      .get(userId) as AdminAccountRow | undefined;

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

  resetPassword(id: string, passwordHash: string, updatedAt: string): void {
    this.db
      .prepare(
        `
          UPDATE admin_accounts
          SET password_hash = ?, must_change_password = 1, updated_at = ?
          WHERE id = ?
        `
      )
      .run(passwordHash, updatedAt, id);
  }

  updateAvatar(id: string, avatarUploadId: string | null, updatedAt: string): void {
    if (!this.hasAvatarUploadColumn) {
      this.db
        .prepare(
          `
            UPDATE admin_accounts
            SET updated_at = ?
            WHERE id = ?
          `
        )
        .run(updatedAt, id);
      return;
    }

    this.db
      .prepare(
        `
          UPDATE admin_accounts
          SET avatar_upload_id = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(avatarUploadId, updatedAt, id);
  }

  updateProfile(
    accountId: string,
    input: {
      nickname: string;
      email: string | null;
      mobile: string | null;
      remark: string | null;
    },
    updatedAt: string
  ): void {
    const account = this.findById(accountId);
    if (!account) {
      return;
    }

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `
            UPDATE admin_accounts
            SET nickname = ?, updated_at = ?
            WHERE id = ?
          `
        )
        .run(input.nickname, updatedAt, accountId);

      if (account.userId) {
        this.db
          .prepare(
            `
              UPDATE users
              SET display_name = ?, email = ?, mobile = ?, remark = ?, updated_at = ?
              WHERE id = ?
            `
          )
          .run(input.nickname, input.email, input.mobile, input.remark, updatedAt, account.userId);
      }
    });

    tx();
  }

  updateStatus(id: string, status: "active" | "inactive", updatedAt: string): void {
    this.db
      .prepare(
        `
          UPDATE admin_accounts
          SET status = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(status, updatedAt, id);
  }

  private mapRow(row: AdminAccountRow): AdminAccountEntity {
    return {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      email: row.email,
      mobile: row.mobile,
      remark: row.remark,
      passwordHash: row.password_hash,
      nickname: row.nickname,
      avatarUploadId: row.avatar_upload_id ?? null,
      role: row.role,
      status: row.status,
      mustChangePassword: row.must_change_password === 1,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private detectAvatarUploadColumn(): boolean {
    const columns = this.db.prepare("PRAGMA table_info(admin_accounts)").all() as Array<{ name: string }>;
    return columns.some((column) => column.name === "avatar_upload_id");
  }
}
