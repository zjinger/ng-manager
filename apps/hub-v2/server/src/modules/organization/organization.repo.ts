import type Database from "better-sqlite3";
import type {
  DepartmentEntity,
  DepartmentStatus,
  ListDepartmentsQuery,
  UserDepartmentEntity,
  UserDepartmentInput
} from "./organization.types";

type DepartmentRow = {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  external_finance_code: string | null;
  manager_user_id: string | null;
  manager_username: string | null;
  manager_display_name: string | null;
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
  role_code: string | null;
  created_at: string;
  updated_at: string;
};

export class OrganizationRepo {
  constructor(private readonly db: Database.Database) {}

  listDepartments(query: ListDepartmentsQuery = {}): DepartmentEntity[] {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.status) {
      conditions.push("d.status = ?");
      params.push(query.status);
    }
    if (query.keyword?.trim()) {
      conditions.push("(d.code LIKE ? OR d.name LIKE ? OR d.external_finance_code LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(
        `
          SELECT
            d.id, d.parent_id, d.code, d.name, d.external_finance_code, d.manager_user_id,
            u.username AS manager_username,
            u.display_name AS manager_display_name,
            d.status, d.sort, d.created_at, d.updated_at
          FROM departments d
          LEFT JOIN users u ON u.id = d.manager_user_id
          ${whereClause}
          ORDER BY d.sort ASC, d.name ASC, d.created_at DESC
        `
      )
      .all(...params) as DepartmentRow[];
    return rows.map((row) => this.mapDepartment(row));
  }

  findDepartmentById(id: string): DepartmentEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT
            d.id, d.parent_id, d.code, d.name, d.external_finance_code, d.manager_user_id,
            u.username AS manager_username,
            u.display_name AS manager_display_name,
            d.status, d.sort, d.created_at, d.updated_at
          FROM departments d
          LEFT JOIN users u ON u.id = d.manager_user_id
          WHERE d.id = ?
        `
      )
      .get(id) as DepartmentRow | undefined;
    return row ? this.mapDepartment(row) : null;
  }

  findDepartmentByCode(code: string): DepartmentEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT
            d.id, d.parent_id, d.code, d.name, d.external_finance_code, d.manager_user_id,
            u.username AS manager_username,
            u.display_name AS manager_display_name,
            d.status, d.sort, d.created_at, d.updated_at
          FROM departments d
          LEFT JOIN users u ON u.id = d.manager_user_id
          WHERE d.code = ?
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
            id, parent_id, code, name, external_finance_code, manager_user_id, status, sort, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.parentId,
        entity.code,
        entity.name,
        entity.externalFinanceCode,
        entity.managerUserId,
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
          SET parent_id = ?, code = ?, name = ?, external_finance_code = ?, manager_user_id = ?, status = ?, sort = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(
        entity.parentId,
        entity.code,
        entity.name,
        entity.externalFinanceCode,
        entity.managerUserId,
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
            ud.role_code,
            ud.created_at,
            ud.updated_at
          FROM user_departments ud
          INNER JOIN departments d ON d.id = ud.department_id
          WHERE ud.user_id = ?
          ORDER BY d.sort ASC, d.name ASC
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
            ud.role_code,
            ud.created_at,
            ud.updated_at
          FROM user_departments ud
          INNER JOIN departments d ON d.id = ud.department_id
          WHERE ud.user_id IN (${placeholders})
          ORDER BY d.sort ASC, d.name ASC
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
          ) VALUES (?, ?, ?, 'primary', ?, ?, ?)
        `
      );
      for (const entry of entries) {
        insert.run(
          entry.id,
          userId,
          entry.departmentId,
          entry.roleCode?.trim() || null,
          entry.createdAt,
          entry.updatedAt
        );
      }
    });
    transaction();
  }

  addUserDepartment(userId: string, entry: UserDepartmentInput & { id: string; createdAt: string; updatedAt: string }): void {
    const transaction = this.db.transaction(() => {
      this.db.prepare("DELETE FROM user_departments WHERE user_id = ?").run(userId);
      this.db
        .prepare(
          `
            INSERT INTO user_departments (
              id, user_id, department_id, relation_type, role_code, created_at, updated_at
            ) VALUES (?, ?, ?, 'primary', ?, ?, ?)
          `
        )
        .run(
          entry.id,
          userId,
          entry.departmentId,
          entry.roleCode?.trim() || null,
          entry.createdAt,
          entry.updatedAt
        );
    });
    transaction();
  }

  removeUserDepartment(userId: string, departmentId: string): void {
    this.db.prepare("DELETE FROM user_departments WHERE user_id = ? AND department_id = ?").run(userId, departmentId);
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
      managerUserId: row.manager_user_id,
      managerUser: row.manager_user_id
        ? {
            id: row.manager_user_id,
            username: row.manager_username ?? "",
            displayName: row.manager_display_name
          }
        : null,
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
      roleCode: row.role_code,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
