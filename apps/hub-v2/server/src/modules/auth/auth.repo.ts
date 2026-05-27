import type Database from "better-sqlite3";
import type { AdminAccountEntity, AdminProfileDepartment, AdminProfileSystemRole } from "./auth.types";

type AdminAccountRow = {
  id: string;
  user_id: string | null;
  username: string;
  email: string | null;
  mobile: string | null;
  remark: string | null;
  organization_title_code: string | null;
  organization_title_name: string | null;
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

type AccountIdentityRow = {
  id: string;
  user_id: string | null;
  username: string;
  nickname: string;
  role: "admin" | "user";
  status: "active" | "inactive";
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
            u.organization_title_code,
            ot.name as organization_title_name,
            a.password_hash,
            COALESCE(NULLIF(u.display_name, ''), a.nickname) AS nickname,
            ${this.hasAvatarUploadColumn ? "a.avatar_upload_id," : ""}
            a.role,
            CASE WHEN u.id IS NOT NULL AND u.status = 'inactive' THEN 'inactive' ELSE a.status END AS status,
            a.must_change_password,
            a.last_login_at,
            a.created_at,
            a.updated_at
          FROM admin_accounts a
          LEFT JOIN users u ON u.id = a.user_id
          LEFT JOIN organization_titles ot ON ot.code = u.organization_title_code
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
            u.organization_title_code,
            ot.name as organization_title_name,
            a.password_hash,
            COALESCE(NULLIF(u.display_name, ''), a.nickname) AS nickname,
            ${this.hasAvatarUploadColumn ? "a.avatar_upload_id," : ""}
            a.role,
            CASE WHEN u.id IS NOT NULL AND u.status = 'inactive' THEN 'inactive' ELSE a.status END AS status,
            a.must_change_password,
            a.last_login_at,
            a.created_at,
            a.updated_at
          FROM admin_accounts a
          LEFT JOIN users u ON u.id = a.user_id
          LEFT JOIN organization_titles ot ON ot.code = u.organization_title_code
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
            u.organization_title_code,
            ot.name as organization_title_name,
            a.password_hash,
            COALESCE(NULLIF(u.display_name, ''), a.nickname) AS nickname,
            ${this.hasAvatarUploadColumn ? "a.avatar_upload_id," : ""}
            a.role,
            CASE WHEN u.id IS NOT NULL AND u.status = 'inactive' THEN 'inactive' ELSE a.status END AS status,
            a.must_change_password,
            a.last_login_at,
            a.created_at,
            a.updated_at
          FROM admin_accounts a
          LEFT JOIN users u ON u.id = a.user_id
          LEFT JOIN organization_titles ot ON ot.code = u.organization_title_code
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

  updateMustChangePassword(id: string, mustChangePassword: boolean, updatedAt: string): void {
    this.db
      .prepare(
        `
          UPDATE admin_accounts
          SET must_change_password = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(mustChangePassword ? 1 : 0, updatedAt, id);
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

  updateNickname(id: string, nickname: string, updatedAt: string): void {
    this.db
      .prepare(
        `
          UPDATE admin_accounts
          SET nickname = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(nickname, updatedAt, id);
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

  listAccountIdentities(): Array<{
    id: string;
    userId: string | null;
    username: string;
    nickname: string;
    role: "admin" | "user";
    status: "active" | "inactive";
    createdAt: string;
    updatedAt: string;
  }> {
    const rows = this.db
      .prepare(
        `
          SELECT id, user_id, username, nickname, role, status, created_at, updated_at
          FROM admin_accounts
        `
      )
      .all() as AccountIdentityRow[];
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      nickname: row.nickname,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  createUserForAccount(input: {
    id: string;
    username: string;
    displayName: string | null;
    status: "active" | "inactive";
    source: "local";
    createdAt: string;
    updatedAt: string;
  }): void {
    this.db
      .prepare(
        `
          INSERT INTO users (
            id, username, display_name, status, source, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        input.id,
        input.username,
        input.displayName,
        input.status,
        input.source,
        input.createdAt,
        input.updatedAt
      );
  }

  bindAccountUser(accountId: string, userId: string, updatedAt: string): void {
    this.db
      .prepare(
        `
          UPDATE admin_accounts
          SET user_id = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(userId, updatedAt, accountId);
  }

  ensureSystemRoleBindingByCode(userId: string, roleCode: string, createdAt: string): void {
    this.db
      .prepare(
        `
          INSERT OR IGNORE INTO user_system_roles (id, user_id, role_id, created_at)
          SELECT ?, ?, id, ?
          FROM system_roles
          WHERE code = ?
          LIMIT 1
        `
      )
      .run(`usr_sync_${userId}_${roleCode}`, userId, createdAt, roleCode);
  }

  replacePlatformRoleBindings(userId: string, roleCode: string, createdAt: string): void {
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `
            DELETE FROM user_system_roles
            WHERE user_id = ?
              AND role_id IN (
                SELECT id FROM system_roles WHERE code IN ('super_admin', 'admin', 'member')
              )
          `
        )
        .run(userId);

      this.db
        .prepare(
          `
            INSERT OR IGNORE INTO user_system_roles (id, user_id, role_id, created_at)
            SELECT ?, ?, id, ?
            FROM system_roles
            WHERE code = ?
            LIMIT 1
          `
        )
        .run(`usr_sync_${userId}_${roleCode}`, userId, createdAt, roleCode);
    });
    tx();
  }

  findUserPrimaryDepartment(userId: string): AdminProfileDepartment | null {
    if (!userId.trim()) {
      return null;
    }
    const row = this.db
      .prepare(
        `
          SELECT d.id, d.code, d.name
          FROM user_departments ud
          INNER JOIN departments d ON d.id = ud.department_id
          WHERE ud.user_id = ?
          ORDER BY d.sort ASC, d.created_at ASC
          LIMIT 1
        `
      )
      .get(userId) as AdminProfileDepartment | undefined;
    return row ?? null;
  }

  listUserSystemRoles(userId: string): AdminProfileSystemRole[] {
    if (!userId.trim()) {
      return [];
    }
    return this.db
      .prepare(
        `
          SELECT r.id, r.code, r.name, r.purpose_code as purposeCode, r.purpose_name as purposeName
          FROM user_system_roles ur
          INNER JOIN system_roles r ON r.id = ur.role_id
          WHERE ur.user_id = ?
          ORDER BY r.sort ASC, r.created_at ASC
        `
      )
      .all(userId) as AdminProfileSystemRole[];
  }

  listUserPermissionCodes(userId: string): string[] {
    if (!userId.trim()) {
      return [];
    }
    const rows = this.db
      .prepare(
        `
          SELECT DISTINCT p.code
          FROM user_system_roles ur
          INNER JOIN system_role_permissions rp ON rp.role_id = ur.role_id
          INNER JOIN system_permissions p ON p.id = rp.permission_id
          WHERE ur.user_id = ?
          ORDER BY p.code ASC
        `
      )
      .all(userId) as Array<{ code: string }>;
    return rows.map((row) => row.code);
  }

  listPermissionCodesByAccountId(accountId: string): string[] {
    const normalized = accountId.trim();
    if (!normalized) {
      return [];
    }
    const rows = this.db
      .prepare(
        `
          SELECT DISTINCT p.code
          FROM admin_accounts a
          INNER JOIN user_system_roles ur ON ur.user_id = a.user_id
          INNER JOIN system_role_permissions rp ON rp.role_id = ur.role_id
          INNER JOIN system_permissions p ON p.id = rp.permission_id
          WHERE a.id = ?
          ORDER BY p.code ASC
        `
      )
      .all(normalized) as Array<{ code: string }>;
    return rows.map((row) => row.code);
  }

  private mapRow(row: AdminAccountRow): AdminAccountEntity {
    return {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      email: row.email,
      mobile: row.mobile,
      remark: row.remark,
      organizationTitleCode: row.organization_title_code,
      organizationTitleName: row.organization_title_name ?? row.organization_title_code,
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
