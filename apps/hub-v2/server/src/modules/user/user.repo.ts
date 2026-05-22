import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type { ListUsersQuery, UpdateUserInput, UserEntity, UserListResult } from "./user.types";
import type { UserDepartmentEntity } from "../organization/organization.types";

type UserRow = {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  mobile: string | null;
  organization_title_code: string | null;
  organization_title_name: string | null;
  default_project_title_code: string | null;
  default_project_title_name: string | null;
  avatar_upload_id: string | null;
  login_enabled: number;
  status: "active" | "inactive";
  source: "local" | "imported";
  remark: string | null;
  manager_user_id: string | null;
  manager_username: string | null;
  manager_display_name: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export class UserRepo {
  private readonly hasAdminAvatarColumn: boolean;

  constructor(private readonly db: Database.Database) {
    this.hasAdminAvatarColumn = this.detectAdminAvatarColumn();
  }

  findById(id: string): UserEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT
            u.id,
            u.username,
            u.display_name,
            u.email,
            u.mobile,
            u.organization_title_code,
            ot.name AS organization_title_name,
            u.default_project_title_code,
            pt.name AS default_project_title_name,
            ${this.hasAdminAvatarColumn ? "aa.avatar_upload_id" : "NULL AS avatar_upload_id"},
            CASE WHEN u.status = 'active' AND aa.id IS NOT NULL AND aa.status = 'active' THEN 1 ELSE 0 END AS login_enabled,
            u.status,
            u.source,
            u.remark,
            u.manager_user_id,
            manager.username AS manager_username,
            manager.display_name AS manager_display_name,
            aa.last_login_at,
            u.created_at,
            u.updated_at
          FROM users u
          LEFT JOIN admin_accounts aa ON aa.user_id = u.id
          LEFT JOIN users manager ON manager.id = u.manager_user_id
          LEFT JOIN organization_titles ot ON ot.code = u.organization_title_code
          LEFT JOIN project_titles pt ON pt.code = u.default_project_title_code
          WHERE u.id = ?
        `
      )
      .get(id) as UserRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findByUsername(username: string): UserEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT
            u.id,
            u.username,
            u.display_name,
            u.email,
            u.mobile,
            u.organization_title_code,
            ot.name AS organization_title_name,
            u.default_project_title_code,
            pt.name AS default_project_title_name,
            ${this.hasAdminAvatarColumn ? "aa.avatar_upload_id" : "NULL AS avatar_upload_id"},
            CASE WHEN u.status = 'active' AND aa.id IS NOT NULL AND aa.status = 'active' THEN 1 ELSE 0 END AS login_enabled,
            u.status,
            u.source,
            u.remark,
            u.manager_user_id,
            manager.username AS manager_username,
            manager.display_name AS manager_display_name,
            aa.last_login_at,
            u.created_at,
            u.updated_at
          FROM users u
          LEFT JOIN admin_accounts aa ON aa.user_id = u.id
          LEFT JOIN users manager ON manager.id = u.manager_user_id
          LEFT JOIN organization_titles ot ON ot.code = u.organization_title_code
          LEFT JOIN project_titles pt ON pt.code = u.default_project_title_code
          WHERE u.username = ?
        `
      )
      .get(username) as UserRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  create(entity: UserEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO users (
          id, username, display_name, email, mobile, organization_title_code, default_project_title_code, status, source, remark,
          manager_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.username,
        entity.displayName,
        entity.email,
        entity.mobile,
        entity.organizationTitleCode,
        entity.defaultProjectTitleCode,
        entity.status,
        entity.source,
        entity.remark,
        entity.managerUserId,
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
          organization_title_code = ?,
          default_project_title_code = ?,
          status = ?,
          remark = ?,
          manager_user_id = ?,
          updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        input.displayName ?? null,
        input.email ?? null,
        input.mobile ?? null,
        input.organizationTitleCode ?? null,
        input.defaultProjectTitleCode ?? null,
        input.status ?? "active",
        input.remark ?? null,
        input.managerUserId ?? null,
        updatedAt,
        id
      );
  }

  list(query: ListUsersQuery): UserListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      conditions.push("u.status = ?");
      params.push(query.status);
    }

    if (query.departmentId?.trim()) {
      conditions.push(
        "EXISTS (SELECT 1 FROM user_departments ud_filter WHERE ud_filter.user_id = u.id AND ud_filter.department_id = ?)"
      );
      params.push(query.departmentId.trim());
    }

    if (query.keyword?.trim()) {
      conditions.push("(u.username LIKE ? OR u.display_name LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM users u ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT
            u.id,
            u.username,
            u.display_name,
            u.email,
            u.mobile,
            u.organization_title_code,
            ot.name AS organization_title_name,
            u.default_project_title_code,
            pt.name AS default_project_title_name,
            ${this.hasAdminAvatarColumn ? "aa.avatar_upload_id" : "NULL AS avatar_upload_id"},
            CASE WHEN u.status = 'active' AND aa.id IS NOT NULL AND aa.status = 'active' THEN 1 ELSE 0 END AS login_enabled,
            u.status,
            u.source,
            u.remark,
            u.manager_user_id,
            manager.username AS manager_username,
            manager.display_name AS manager_display_name,
            aa.last_login_at,
            u.created_at,
            u.updated_at
          FROM users u
          LEFT JOIN admin_accounts aa ON aa.user_id = u.id
          LEFT JOIN users manager ON manager.id = u.manager_user_id
          LEFT JOIN organization_titles ot ON ot.code = u.organization_title_code
          LEFT JOIN project_titles pt ON pt.code = u.default_project_title_code
          ${whereClause}
          ORDER BY u.created_at DESC, u.updated_at DESC
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

  attachDepartments(entity: UserEntity, departments: UserDepartmentEntity[]): UserEntity {
    return {
      ...entity,
      departments,
      primaryDepartment: departments[0] ?? null
    };
  }

  private mapRow(row: UserRow): UserEntity {
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      email: row.email,
      mobile: row.mobile,
      organizationTitleCode: row.organization_title_code,
      organizationTitleName: row.organization_title_name ?? row.organization_title_code,
      defaultProjectTitleCode: row.default_project_title_code,
      defaultProjectTitleName: row.default_project_title_name ?? row.default_project_title_code,
      avatarUploadId: row.avatar_upload_id ?? null,
      avatarUrl: row.avatar_upload_id ? `/api/admin/uploads/${row.avatar_upload_id}/raw` : null,
      loginEnabled: row.login_enabled === 1,
      status: row.status,
      source: row.source,
      remark: row.remark,
      departments: [],
      primaryDepartment: null,
      managerUserId: row.manager_user_id,
      managerUser: row.manager_user_id
        ? {
            id: row.manager_user_id,
            username: row.manager_username ?? "",
            displayName: row.manager_display_name
          }
        : null,
      lastLoginAt: row.last_login_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private detectAdminAvatarColumn(): boolean {
    const rows = this.db.prepare("PRAGMA table_info(admin_accounts)").all() as Array<{ name: string }>;
    return rows.some((row) => row.name === "avatar_upload_id");
  }
}
