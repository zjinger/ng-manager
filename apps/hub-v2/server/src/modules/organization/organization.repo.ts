import type Database from "better-sqlite3";
import type {
  DepartmentEntity,
  DepartmentRelationType,
  DepartmentStatus,
  FinanceRoleEntity,
  FinanceRoleStatus,
  ListDepartmentsQuery,
  ListFinanceRolesQuery,
  UserDepartmentEntity,
  UserDepartmentInput,
  UserFinanceRoleEntity
} from "./organization.types";

type DepartmentRow = {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  external_finance_code: string | null;
  status: DepartmentStatus;
  sort: number;
  created_at: string;
  updated_at: string;
};

type UserDepartmentRow = {
  id: string;
  user_id: string;
  department_id: string;
  department_code: string;
  department_name: string;
  relation_type: DepartmentRelationType;
  role_code: string | null;
  created_at: string;
  updated_at: string;
};

type FinanceRoleRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: FinanceRoleStatus;
  sort: number;
  created_at: string;
  updated_at: string;
};

type UserFinanceRoleRow = {
  id: string;
  user_id: string;
  role_id: string;
  role_code: string;
  role_name: string;
  created_at: string;
};

export class OrganizationRepo {
  constructor(private readonly db: Database.Database) {}

  listDepartments(query: ListDepartmentsQuery = {}): DepartmentEntity[] {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }
    if (query.keyword?.trim()) {
      conditions.push("(code LIKE ? OR name LIKE ? OR external_finance_code LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(
        `
          SELECT id, parent_id, code, name, external_finance_code, status, sort, created_at, updated_at
          FROM departments
          ${whereClause}
          ORDER BY sort ASC, name ASC, created_at DESC
        `
      )
      .all(...params) as DepartmentRow[];
    return rows.map((row) => this.mapDepartment(row));
  }

  findDepartmentById(id: string): DepartmentEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT id, parent_id, code, name, external_finance_code, status, sort, created_at, updated_at
          FROM departments
          WHERE id = ?
        `
      )
      .get(id) as DepartmentRow | undefined;
    return row ? this.mapDepartment(row) : null;
  }

  findDepartmentByCode(code: string): DepartmentEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT id, parent_id, code, name, external_finance_code, status, sort, created_at, updated_at
          FROM departments
          WHERE code = ?
        `
      )
      .get(code) as DepartmentRow | undefined;
    return row ? this.mapDepartment(row) : null;
  }

  createDepartment(entity: DepartmentEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO departments (
            id, parent_id, code, name, external_finance_code, status, sort, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.parentId,
        entity.code,
        entity.name,
        entity.externalFinanceCode,
        entity.status,
        entity.sort,
        entity.createdAt,
        entity.updatedAt
      );
  }

  updateDepartment(entity: DepartmentEntity): void {
    this.db
      .prepare(
        `
          UPDATE departments
          SET parent_id = ?, code = ?, name = ?, external_finance_code = ?, status = ?, sort = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(
        entity.parentId,
        entity.code,
        entity.name,
        entity.externalFinanceCode,
        entity.status,
        entity.sort,
        entity.updatedAt,
        entity.id
      );
  }

  listUserDepartments(userId: string): UserDepartmentEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            ud.id,
            ud.user_id,
            ud.department_id,
            d.code AS department_code,
            d.name AS department_name,
            ud.relation_type,
            ud.role_code,
            ud.created_at,
            ud.updated_at
          FROM user_departments ud
          INNER JOIN departments d ON d.id = ud.department_id
          WHERE ud.user_id = ?
          ORDER BY CASE ud.relation_type WHEN 'primary' THEN 0 ELSE 1 END, d.sort ASC, d.name ASC
        `
      )
      .all(userId) as UserDepartmentRow[];
    return rows.map((row) => this.mapUserDepartment(row));
  }

  listUserDepartmentsForUsers(userIds: string[]): Map<string, UserDepartmentEntity[]> {
    const result = new Map<string, UserDepartmentEntity[]>();
    if (userIds.length === 0) {
      return result;
    }
    const placeholders = userIds.map(() => "?").join(", ");
    const rows = this.db
      .prepare(
        `
          SELECT
            ud.id,
            ud.user_id,
            ud.department_id,
            d.code AS department_code,
            d.name AS department_name,
            ud.relation_type,
            ud.role_code,
            ud.created_at,
            ud.updated_at
          FROM user_departments ud
          INNER JOIN departments d ON d.id = ud.department_id
          WHERE ud.user_id IN (${placeholders})
          ORDER BY CASE ud.relation_type WHEN 'primary' THEN 0 ELSE 1 END, d.sort ASC, d.name ASC
        `
      )
      .all(...userIds) as UserDepartmentRow[];
    for (const row of rows) {
      const mapped = this.mapUserDepartment(row);
      const items = result.get(mapped.userId) ?? [];
      items.push(mapped);
      result.set(mapped.userId, items);
    }
    return result;
  }

  replaceUserDepartments(userId: string, entries: Array<UserDepartmentInput & { id: string; createdAt: string; updatedAt: string }>): void {
    const transaction = this.db.transaction(() => {
      this.db.prepare("DELETE FROM user_departments WHERE user_id = ?").run(userId);
      const insert = this.db.prepare(
        `
          INSERT INTO user_departments (
            id, user_id, department_id, relation_type, role_code, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      );
      for (const entry of entries) {
        insert.run(
          entry.id,
          userId,
          entry.departmentId,
          entry.relationType ?? "secondary",
          entry.roleCode?.trim() || null,
          entry.createdAt,
          entry.updatedAt
        );
      }
    });
    transaction();
  }

  addUserDepartment(userId: string, entry: UserDepartmentInput & { id: string; createdAt: string; updatedAt: string }): void {
    this.db
      .prepare(
        `
          INSERT INTO user_departments (
            id, user_id, department_id, relation_type, role_code, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, department_id) DO UPDATE SET
            relation_type = excluded.relation_type,
            role_code = excluded.role_code,
            updated_at = excluded.updated_at
        `
      )
      .run(
        entry.id,
        userId,
        entry.departmentId,
        entry.relationType ?? "secondary",
        entry.roleCode?.trim() || null,
        entry.createdAt,
        entry.updatedAt
      );
  }

  removeUserDepartment(userId: string, departmentId: string): void {
    this.db.prepare("DELETE FROM user_departments WHERE user_id = ? AND department_id = ?").run(userId, departmentId);
  }

  listFinanceRoles(query: ListFinanceRolesQuery = {}): FinanceRoleEntity[] {
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
      .prepare(
        `
          SELECT id, code, name, description, status, sort, created_at, updated_at
          FROM finance_roles
          ${whereClause}
          ORDER BY sort ASC, name ASC, created_at DESC
        `
      )
      .all(...params) as FinanceRoleRow[];
    return rows.map((row) => this.mapFinanceRole(row));
  }

  findFinanceRoleById(id: string): FinanceRoleEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, description, status, sort, created_at, updated_at FROM finance_roles WHERE id = ?")
      .get(id) as FinanceRoleRow | undefined;
    return row ? this.mapFinanceRole(row) : null;
  }

  findFinanceRoleByCode(code: string): FinanceRoleEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, description, status, sort, created_at, updated_at FROM finance_roles WHERE code = ?")
      .get(code) as FinanceRoleRow | undefined;
    return row ? this.mapFinanceRole(row) : null;
  }

  createFinanceRole(entity: FinanceRoleEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO finance_roles (id, code, name, description, status, sort, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(entity.id, entity.code, entity.name, entity.description, entity.status, entity.sort, entity.createdAt, entity.updatedAt);
  }

  updateFinanceRole(entity: FinanceRoleEntity): void {
    this.db
      .prepare(
        `
          UPDATE finance_roles
          SET code = ?, name = ?, description = ?, status = ?, sort = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(entity.code, entity.name, entity.description, entity.status, entity.sort, entity.updatedAt, entity.id);
  }

  deleteFinanceRole(id: string): void {
    this.db.prepare("DELETE FROM finance_roles WHERE id = ?").run(id);
  }

  listUserFinanceRoles(userId: string): UserFinanceRoleEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            ufr.id,
            ufr.user_id,
            ufr.role_id,
            fr.code AS role_code,
            fr.name AS role_name,
            ufr.created_at
          FROM user_finance_roles ufr
          INNER JOIN finance_roles fr ON fr.id = ufr.role_id
          WHERE ufr.user_id = ?
          ORDER BY fr.sort ASC, fr.name ASC
        `
      )
      .all(userId) as UserFinanceRoleRow[];
    return rows.map((row) => this.mapUserFinanceRole(row));
  }

  addUserFinanceRole(userId: string, roleId: string, id: string, createdAt: string): void {
    this.db
      .prepare(
        `
          INSERT OR IGNORE INTO user_finance_roles (id, user_id, role_id, created_at)
          VALUES (?, ?, ?, ?)
        `
      )
      .run(id, userId, roleId, createdAt);
  }

  removeUserFinanceRole(userId: string, roleId: string): void {
    this.db.prepare("DELETE FROM user_finance_roles WHERE user_id = ? AND role_id = ?").run(userId, roleId);
  }

  userExists(userId: string): boolean {
    const row = this.db.prepare("SELECT id FROM users WHERE id = ?").get(userId) as { id: string } | undefined;
    return !!row;
  }

  private mapDepartment(row: DepartmentRow): DepartmentEntity {
    return {
      id: row.id,
      parentId: row.parent_id,
      code: row.code,
      name: row.name,
      externalFinanceCode: row.external_finance_code,
      status: row.status,
      sort: row.sort,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapUserDepartment(row: UserDepartmentRow): UserDepartmentEntity {
    return {
      id: row.id,
      userId: row.user_id,
      departmentId: row.department_id,
      departmentCode: row.department_code,
      departmentName: row.department_name,
      relationType: row.relation_type,
      roleCode: row.role_code,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapFinanceRole(row: FinanceRoleRow): FinanceRoleEntity {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      status: row.status,
      sort: row.sort,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapUserFinanceRole(row: UserFinanceRoleRow): UserFinanceRoleEntity {
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
