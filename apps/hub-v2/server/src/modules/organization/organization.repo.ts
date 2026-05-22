import type Database from "better-sqlite3";
import type {
  DepartmentTitleEntity,
  DepartmentEntity,
  DepartmentTitleInput,
  DepartmentStatus,
  ListDepartmentsQuery,
  OrganizationUserSummary,
  UserDepartmentEntity,
  UserDepartmentInput
} from "./organization.types";

type DepartmentRow = {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  description: string | null;
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

type DepartmentTitleRow = {
  id: string;
  department_id: string;
  organization_title_code: string;
  title_name: string;
  title_status: "active" | "inactive";
  sort: number;
  member_count: number;
  created_at: string;
  updated_at: string;
};

type UserSummaryRow = {
  id: string;
  username: string;
  display_name: string | null;
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
            d.description,
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
            d.description,
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
            d.description,
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
            id, parent_id, code, name, description, external_finance_code, manager_user_id, status, sort, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.parentId,
        entity.code,
        entity.name,
        entity.description,
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
          SET parent_id = ?, code = ?, name = ?, description = ?, external_finance_code = ?, manager_user_id = ?, status = ?, sort = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(
        entity.parentId,
        entity.code,
        entity.name,
        entity.description,
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
            id, user_id, department_id, role_code, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
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
              id, user_id, department_id, role_code, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
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

  listDepartmentTitles(departmentId: string): DepartmentTitleEntity[] {
    const rows = this.db.prepare(
      `
        SELECT
          dt.id,
          dt.department_id,
          dt.organization_title_code,
          st.name AS title_name,
          st.status AS title_status,
          COALESCE(dt.sort, st.sort) AS sort,
          (
            SELECT COUNT(*)
            FROM users u
            INNER JOIN user_departments ud ON ud.user_id = u.id
            WHERE ud.department_id = dt.department_id AND u.organization_title_code = dt.organization_title_code
          ) AS member_count,
          dt.created_at,
          dt.updated_at
        FROM department_titles dt
        INNER JOIN organization_titles st ON st.code = dt.organization_title_code
        WHERE dt.department_id = ?
        ORDER BY dt.sort ASC, st.sort ASC, st.name ASC, dt.created_at DESC
      `
    ).all(departmentId) as DepartmentTitleRow[];
    return rows.map((row) => this.mapDepartmentTitle(row));
  }

  addDepartmentTitle(
    departmentId: string,
    input: DepartmentTitleInput & { id: string; createdAt: string; updatedAt: string }
  ): void {
    this.db
      .prepare(
        `
          INSERT INTO department_titles (
            id, department_id, organization_title_code, sort, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .run(input.id, departmentId, input.titleCode, input.sort ?? 0, input.createdAt, input.updatedAt);
  }

  removeDepartmentTitle(departmentId: string, titleCode: string): void {
    this.db.prepare("DELETE FROM department_titles WHERE department_id = ? AND organization_title_code = ?").run(departmentId, titleCode);
  }

  departmentTitleExists(departmentId: string, titleCode: string): boolean {
    const row = this.db
      .prepare("SELECT id FROM department_titles WHERE department_id = ? AND organization_title_code = ?")
      .get(departmentId, titleCode) as { id: string } | undefined;
    return !!row;
  }

  titleExists(titleCode: string): boolean {
    const row = this.db.prepare("SELECT code FROM organization_titles WHERE code = ?").get(titleCode) as { code: string } | undefined;
    return !!row;
  }

  countDepartmentTitleBindings(titleCode: string): number {
    const row = this.db.prepare("SELECT COUNT(*) AS cnt FROM department_titles WHERE organization_title_code = ?").get(titleCode) as { cnt: number };
    return row.cnt;
  }

  userExists(userId: string): boolean {
    const row = this.db.prepare("SELECT id FROM users WHERE id = ?").get(userId) as { id: string } | undefined;
    return !!row;
  }

  findUserById(userId: string): OrganizationUserSummary | null {
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

  private mapDepartment(row: DepartmentRow): DepartmentEntity {
    return {
      id: row.id,
      parentId: row.parent_id,
      code: row.code,
      name: row.name,
      description: row.description,
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

  private mapDepartmentTitle(row: DepartmentTitleRow): DepartmentTitleEntity {
    return {
      id: row.id,
      departmentId: row.department_id,
      titleCode: row.organization_title_code,
      titleName: row.title_name,
      status: row.title_status,
      sort: row.sort,
      memberCount: row.member_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
