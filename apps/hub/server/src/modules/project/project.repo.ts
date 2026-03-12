import type Database from "better-sqlite3";
import type {
  ListProjectQuery,
  ProjectEntity,
  ProjectListResult,
  ProjectMemberEntity,
  ProjectMemberRole,
  UpdateProjectInput
} from "./project.types";

type ProjectRow = {
  id: string;
  project_key: string;
  name: string;
  description: string | null;
  icon: string | null;
  status: string;
  visibility: string;
  created_at: string;
  updated_at: string;
};

type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
};

type ProjectMemberRoleRow = {
  member_id: string;
  role: string;
};

export class ProjectRepo {
  constructor(private readonly db: Database.Database) {}

  runInTransaction<T>(handler: () => T): T {
    const tx = this.db.transaction(handler);
    return tx();
  }

  create(entity: ProjectEntity): void {
    const stmt = this.db.prepare(`
      INSERT INTO projects (
        id, project_key, name, description, icon, status, visibility, created_at, updated_at
      ) VALUES (
        @id, @project_key, @name, @description, @icon, @status, @visibility, @created_at, @updated_at
      )
    `);

    stmt.run({
      id: entity.id,
      project_key: entity.projectKey,
      name: entity.name,
      description: entity.description ?? null,
      icon: entity.icon ?? null,
      status: entity.status,
      visibility: entity.visibility,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    });
  }

  findById(id: string): ProjectEntity | null {
    const row = this.db
      .prepare(`SELECT * FROM projects WHERE id = ?`)
      .get(id) as ProjectRow | undefined;

    return row ? this.toEntity(row) : null;
  }

  findByKey(projectKey: string): ProjectEntity | null {
    const row = this.db
      .prepare(`SELECT * FROM projects WHERE project_key = ?`)
      .get(projectKey) as ProjectRow | undefined;

    return row ? this.toEntity(row) : null;
  }

  findByName(name: string): ProjectEntity | null {
    const row = this.db
      .prepare(`SELECT * FROM projects WHERE lower(name) = lower(?) LIMIT 1`)
      .get(name) as ProjectRow | undefined;

    return row ? this.toEntity(row) : null;
  }

  findPublicByKey(projectKey: string): ProjectEntity | null {
    const row = this.db
      .prepare(`
        SELECT *
        FROM projects
        WHERE project_key = ?
          AND status = 'active'
          AND visibility = 'public'
      `)
      .get(projectKey) as ProjectRow | undefined;

    return row ? this.toEntity(row) : null;
  }

  update(id: string, patch: UpdateProjectInput & { updatedAt: string }): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.name !== undefined) {
      fields.push("name = ?");
      params.push(patch.name);
    }

    if (patch.description !== undefined) {
      fields.push("description = ?");
      params.push(patch.description ?? null);
    }

    if (patch.icon !== undefined) {
      fields.push("icon = ?");
      params.push(patch.icon ?? null);
    }

    if (patch.status !== undefined) {
      fields.push("status = ?");
      params.push(patch.status);
    }

    if (patch.visibility !== undefined) {
      fields.push("visibility = ?");
      params.push(patch.visibility);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);

    params.push(id);

    const result = this.db
      .prepare(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);

    return result.changes > 0;
  }

  remove(id: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM projects WHERE id = ?`)
      .run(id);

    return result.changes > 0;
  }

  list(query: ListProjectQuery): ProjectListResult {
    const where: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      where.push("status = ?");
      params.push(query.status);
    }

    if (query.visibility) {
      where.push("visibility = ?");
      params.push(query.visibility);
    }

    if (query.keyword) {
      where.push("(project_key LIKE ? OR name LIKE ? OR description LIKE ?)");
      params.push(
        `%${query.keyword}%`,
        `%${query.keyword}%`,
        `%${query.keyword}%`
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (query.page - 1) * query.pageSize;

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM projects ${whereSql}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(`
        SELECT *
        FROM projects
        ${whereSql}
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, query.pageSize, offset) as ProjectRow[];

    return {
      items: rows.map((row) => this.toEntity(row)),
      page: query.page,
      pageSize: query.pageSize,
      total: totalRow.total
    };
  }

  listPublicActive(): ProjectEntity[] {
    const rows = this.db
      .prepare(`
        SELECT *
        FROM projects
        WHERE status = 'active'
          AND visibility = 'public'
        ORDER BY name ASC, created_at DESC
      `)
      .all() as ProjectRow[];

    return rows.map((row) => this.toEntity(row));
  }

  createMember(input: {
    id: string;
    projectId: string;
    userId: string;
    displayName: string;
    roles: ProjectMemberRole[];
    createdAt: string;
    updatedAt: string;
  }): void {
    this.db.prepare(`
      INSERT INTO project_members (
        id, project_id, user_id, display_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      input.id,
      input.projectId,
      input.userId,
      input.displayName,
      input.createdAt,
      input.updatedAt
    );

    for (const role of input.roles) {
      this.db.prepare(`
        INSERT INTO project_member_roles (
          id, member_id, role, created_at
        ) VALUES (?, ?, ?, ?)
      `).run(
        `${input.id}:${role}`,
        input.id,
        role,
        input.createdAt
      );
    }
  }

  listMembers(projectId: string): ProjectMemberEntity[] {
    const memberRows = this.db.prepare(`
      SELECT *
      FROM project_members
      WHERE project_id = ?
      ORDER BY updated_at DESC, created_at DESC
    `).all(projectId) as ProjectMemberRow[];

    if (memberRows.length === 0) {
      return [];
    }

    const memberIds = memberRows.map((item) => item.id);
    const placeholders = memberIds.map(() => "?").join(",");
    const roleRows = this.db.prepare(`
      SELECT member_id, role
      FROM project_member_roles
      WHERE member_id IN (${placeholders})
    `).all(...memberIds) as ProjectMemberRoleRow[];

    const rolesByMemberId = new Map<string, ProjectMemberRole[]>();
    for (const row of roleRows) {
      const list = rolesByMemberId.get(row.member_id) ?? [];
      list.push(row.role as ProjectMemberRole);
      rolesByMemberId.set(row.member_id, list);
    }

    return memberRows.map((row) => this.toMemberEntity(row, rolesByMemberId.get(row.id) ?? []));
  }

  findMemberById(projectId: string, memberId: string): ProjectMemberEntity | null {
    const row = this.db.prepare(`
      SELECT *
      FROM project_members
      WHERE id = ? AND project_id = ?
      LIMIT 1
    `).get(memberId, projectId) as ProjectMemberRow | undefined;

    if (!row) {
      return null;
    }

    const roles = this.listMemberRoles(row.id);
    return this.toMemberEntity(row, roles);
  }

  findMemberByProjectAndUserId(projectId: string, userId: string): ProjectMemberEntity | null {
    const row = this.db.prepare(`
      SELECT *
      FROM project_members
      WHERE project_id = ? AND user_id = ?
      LIMIT 1
    `).get(projectId, userId) as ProjectMemberRow | undefined;

    if (!row) {
      return null;
    }

    const roles = this.listMemberRoles(row.id);
    return this.toMemberEntity(row, roles);
  }

  updateMember(projectId: string, memberId: string, patch: {
    displayName?: string;
    updatedAt: string;
  }): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.displayName !== undefined) {
      fields.push("display_name = ?");
      params.push(patch.displayName);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);

    params.push(memberId, projectId);

    const result = this.db.prepare(`
      UPDATE project_members
      SET ${fields.join(", ")}
      WHERE id = ? AND project_id = ?
    `).run(...params);

    return result.changes > 0;
  }

  replaceMemberRoles(memberId: string, roles: ProjectMemberRole[], createdAt: string): void {
    this.db.prepare(`DELETE FROM project_member_roles WHERE member_id = ?`).run(memberId);

    for (const role of roles) {
      this.db.prepare(`
        INSERT INTO project_member_roles (
          id, member_id, role, created_at
        ) VALUES (?, ?, ?, ?)
      `).run(
        `${memberId}:${role}`,
        memberId,
        role,
        createdAt
      );
    }
  }

  deleteMember(projectId: string, memberId: string): boolean {
    const result = this.db.prepare(`
      DELETE FROM project_members
      WHERE id = ? AND project_id = ?
    `).run(memberId, projectId);

    return result.changes > 0;
  }

  private listMemberRoles(memberId: string): ProjectMemberRole[] {
    const rows = this.db.prepare(`
      SELECT role
      FROM project_member_roles
      WHERE member_id = ?
    `).all(memberId) as Array<{ role: string }>;

    return rows.map((row) => row.role as ProjectMemberRole);
  }

  private toEntity(row: ProjectRow): ProjectEntity {
    return {
      id: row.id,
      projectKey: row.project_key,
      name: row.name,
      description: row.description,
      icon: row.icon,
      status: row.status as ProjectEntity["status"],
      visibility: row.visibility as ProjectEntity["visibility"],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private toMemberEntity(row: ProjectMemberRow, roles: ProjectMemberRole[]): ProjectMemberEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      displayName: row.display_name,
      roles,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
