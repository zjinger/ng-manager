import type Database from "better-sqlite3";
import type {
  SystemRoleEntity,
  SystemRoleStatus,
  SystemPermissionEntity,
  SystemPermissionStatus,
  SystemRbacUserSummary,
  UserSystemRoleEntity,
  RoleUserEntity,
  ListSystemRolesQuery,
  ListSystemPermissionsQuery
} from "./system-rbac.types";

type SystemRoleRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_builtin: number;
  purpose_code: string;
  purpose_name: string;
  status: SystemRoleStatus;
  sort: number;
  created_at: string;
  updated_at: string;
};

type SystemPermissionRow = {
  id: string;
  code: string;
  name: string;
  status: SystemPermissionStatus;
  is_builtin: number;
  group_code: string;
  group_name: string;
  domain_code: string;
  domain_name: string;
  description: string | null;
  sort: number;
  created_at: string;
  updated_at: string;
};

type UserSystemRoleRow = {
  id: string;
  user_id: string;
  role_id: string;
  role_code: string;
  role_name: string;
  created_at: string;
};

type RoleUserRow = {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
  username: string;
  display_name: string;
  email: string | null;
  avatar_upload_id: string | null;
};

type UserSummaryRow = {
  id: string;
  username: string;
  display_name: string | null;
};

export class SystemRbacRepo {
  constructor(private readonly db: Database.Database) {}

  findRoleById(id: string): SystemRoleEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at FROM system_roles WHERE id = ?")
      .get(id) as SystemRoleRow | undefined;
    return row ? this.mapRole(row) : null;
  }

  findRoleByCode(code: string): SystemRoleEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at FROM system_roles WHERE code = ?")
      .get(code) as SystemRoleRow | undefined;
    return row ? this.mapRole(row) : null;
  }

  listRoles(query: ListSystemRolesQuery = {}): SystemRoleEntity[] {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }
    if (query.keyword?.trim()) {
      conditions.push("(code LIKE ? OR name LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(`SELECT id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at FROM system_roles ${whereClause} ORDER BY sort ASC, name ASC, created_at DESC`)
      .all(...params) as SystemRoleRow[];
    return rows.map((row) => this.mapRole(row));
  }

  createRole(entity: SystemRoleEntity): void {
    this.db
      .prepare("INSERT INTO system_roles (id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(entity.id, entity.code, entity.name, entity.description, entity.isBuiltin ? 1 : 0, entity.purposeCode, entity.purposeName, entity.status, entity.sort, entity.createdAt, entity.updatedAt);
  }

  updateRole(entity: SystemRoleEntity): void {
    this.db
      .prepare("UPDATE system_roles SET code = ?, name = ?, description = ?, purpose_code = ?, purpose_name = ?, status = ?, sort = ?, updated_at = ? WHERE id = ?")
      .run(entity.code, entity.name, entity.description, entity.purposeCode, entity.purposeName, entity.status, entity.sort, entity.updatedAt, entity.id);
  }

  deleteRole(id: string): void {
    this.db.prepare("DELETE FROM system_roles WHERE id = ?").run(id);
  }

  listPermissions(query: ListSystemPermissionsQuery = {}): SystemPermissionEntity[] {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      conditions.push("(code LIKE ? OR name LIKE ? OR group_name LIKE ? OR domain_name LIKE ?)");
      params.push(keyword, keyword, keyword, keyword);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(`SELECT id, code, name, status, is_builtin, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at FROM system_permissions ${whereClause} ORDER BY domain_code ASC, group_code ASC, sort ASC`)
      .all(...params) as SystemPermissionRow[];
    return rows.map((row) => this.mapPermission(row));
  }

  findPermissionById(id: string): SystemPermissionEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, status, is_builtin, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at FROM system_permissions WHERE id = ?")
      .get(id) as SystemPermissionRow | undefined;
    return row ? this.mapPermission(row) : null;
  }

  findPermissionByCode(code: string): SystemPermissionEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, status, is_builtin, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at FROM system_permissions WHERE code = ?")
      .get(code) as SystemPermissionRow | undefined;
    return row ? this.mapPermission(row) : null;
  }

  createPermission(entity: SystemPermissionEntity): void {
    this.db
      .prepare("INSERT INTO system_permissions (id, code, name, status, is_builtin, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(entity.id, entity.code, entity.name, entity.status, entity.isBuiltin ? 1 : 0, entity.groupCode, entity.groupName, entity.domainCode, entity.domainName, entity.description, entity.sort, entity.createdAt, entity.updatedAt);
  }

  updatePermission(entity: SystemPermissionEntity): void {
    this.db
      .prepare("UPDATE system_permissions SET code = ?, name = ?, status = ?, group_code = ?, group_name = ?, domain_code = ?, domain_name = ?, description = ?, sort = ?, updated_at = ? WHERE id = ?")
      .run(entity.code, entity.name, entity.status, entity.groupCode, entity.groupName, entity.domainCode, entity.domainName, entity.description, entity.sort, entity.updatedAt, entity.id);
  }

  deletePermission(id: string): void {
    this.db.prepare("DELETE FROM system_permissions WHERE id = ?").run(id);
  }

  countPermissionRoleBindings(permissionId: string): number {
    const row = this.db.prepare("SELECT COUNT(*) AS cnt FROM system_role_permissions WHERE permission_id = ?").get(permissionId) as { cnt: number };
    return row.cnt;
  }

  listRolePermissionIds(roleId: string): string[] {
    const rows = this.db
      .prepare("SELECT permission_id FROM system_role_permissions WHERE role_id = ?")
      .all(roleId) as { permission_id: string }[];
    return rows.map((r) => r.permission_id);
  }

  listRolePermissions(roleId: string): SystemPermissionEntity[] {
    const rows = this.db
      .prepare(`
        SELECT p.id, p.code, p.name, p.status, p.is_builtin, p.group_code, p.group_name, p.domain_code, p.domain_name, p.description, p.sort, p.created_at, p.updated_at
        FROM system_role_permissions rp
        INNER JOIN system_permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = ?
        ORDER BY p.domain_code ASC, p.group_code ASC, p.sort ASC
      `)
      .all(roleId) as SystemPermissionRow[];
    return rows.map((row) => this.mapPermission(row));
  }

  setRolePermissions(roleId: string, permissionIds: string[]): void {
    this.db.prepare("DELETE FROM system_role_permissions WHERE role_id = ?").run(roleId);
    if (permissionIds.length === 0) return;
    const insert = this.db.prepare("INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)");
    const now = new Date().toISOString();
    for (const permissionId of permissionIds) {
      insert.run(roleId, permissionId, now);
    }
  }

  listRoleUsers(roleId: string): RoleUserEntity[] {
    const rows = this.db
      .prepare(`
        SELECT usr.id, usr.user_id, usr.role_id, usr.created_at,
               u.username, u.display_name, u.email
        FROM user_system_roles usr
        INNER JOIN users u ON u.id = usr.user_id
        WHERE usr.role_id = ?
        ORDER BY usr.created_at DESC
      `)
      .all(roleId) as Omit<RoleUserRow, 'avatar_upload_id'>[];
    return rows.map((row) => this.mapRoleUser({ ...row, avatar_upload_id: null }));
  }

  countRoleUsers(roleId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS cnt FROM user_system_roles WHERE role_id = ?")
      .get(roleId) as { cnt: number };
    return row.cnt;
  }

  countRolePermissions(roleId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS cnt FROM system_role_permissions WHERE role_id = ?")
      .get(roleId) as { cnt: number };
    return row.cnt;
  }

  addRoleUser(roleId: string, userId: string, id: string, createdAt: string): void {
    this.db
      .prepare("INSERT OR IGNORE INTO user_system_roles (id, user_id, role_id, created_at) VALUES (?, ?, ?, ?)")
      .run(id, userId, roleId, createdAt);
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

  removeRoleUser(roleId: string, userId: string): void {
    this.db.prepare("DELETE FROM user_system_roles WHERE role_id = ? AND user_id = ?").run(roleId, userId);
  }

  listUserSystemRoles(userId: string): UserSystemRoleEntity[] {
    const rows = this.db
      .prepare(`
        SELECT usr.id, usr.user_id, usr.role_id, sr.code AS role_code, sr.name AS role_name, usr.created_at
        FROM user_system_roles usr
        INNER JOIN system_roles sr ON sr.id = usr.role_id
        WHERE usr.user_id = ?
        ORDER BY sr.sort ASC, sr.name ASC
      `)
      .all(userId) as UserSystemRoleRow[];
    return rows.map((row) => this.mapUserSystemRole(row));
  }

  userExists(userId: string): boolean {
    const row = this.db.prepare("SELECT 1 FROM users WHERE id = ?").get(userId) as { 1: number } | undefined;
    return !!row;
  }

  findUserById(userId: string): SystemRbacUserSummary | null {
    const row = this.db
      .prepare("SELECT id, username, display_name FROM users WHERE id = ?")
      .get(userId) as UserSummaryRow | undefined;
    return row
      ? {
          id: row.id,
          username: row.username,
          displayName: row.display_name
        }
      : null;
  }

  private mapRole(row: SystemRoleRow): SystemRoleEntity {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      isBuiltin: row.is_builtin === 1,
      purposeCode: row.purpose_code,
      purposeName: row.purpose_name,
      status: row.status,
      sort: row.sort,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapPermission(row: SystemPermissionRow): SystemPermissionEntity {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      status: row.status,
      isBuiltin: row.is_builtin === 1,
      groupCode: row.group_code,
      groupName: row.group_name,
      domainCode: row.domain_code,
      domainName: row.domain_name,
      description: row.description,
      sort: row.sort,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRoleUser(row: RoleUserRow): RoleUserEntity {
    return {
      id: row.id,
      userId: row.user_id,
      roleId: row.role_id,
      createdAt: row.created_at,
      username: row.username,
      displayName: row.display_name,
      email: row.email,
      avatarUploadId: row.avatar_upload_id
    };
  }

  private mapUserSystemRole(row: UserSystemRoleRow): UserSystemRoleEntity {
    return {
      id: row.id,
      userId: row.user_id,
      roleId: row.role_id,
      roleCode: row.role_code,
      roleName: row.role_name,
      createdAt: row.created_at
    };
  }
}
