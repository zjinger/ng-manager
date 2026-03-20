import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  ListProjectsQuery,
  ProjectEntity,
  ProjectListResult,
  ProjectMemberEntity
} from "./project.types";

type ProjectRow = {
  id: string;
  project_key: string;
  name: string;
  description: string | null;
  icon: string | null;
  status: "active" | "inactive";
  visibility: "internal" | "private";
  created_at: string;
  updated_at: string;
};

type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  display_name: string;
  role_code: string;
  is_owner: number;
  joined_at: string;
  created_at: string;
  updated_at: string;
};

export class ProjectRepo {
  constructor(private readonly db: Database.Database) {}

  findById(id: string): ProjectEntity | null {
    const row = this.db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
    return row ? this.mapProject(row) : null;
  }

  findByKey(projectKey: string): ProjectEntity | null {
    const row = this.db
      .prepare("SELECT * FROM projects WHERE project_key = ?")
      .get(projectKey) as ProjectRow | undefined;
    return row ? this.mapProject(row) : null;
  }

  create(entity: ProjectEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO projects (
          id, project_key, name, description, icon, status, visibility, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.projectKey,
        entity.name,
        entity.description,
        entity.icon,
        entity.status,
        entity.visibility,
        entity.createdAt,
        entity.updatedAt
      );
  }

  list(query: ListProjectsQuery): ProjectListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }

    if (query.keyword?.trim()) {
      conditions.push("(name LIKE ? OR project_key LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM projects ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT * FROM projects
          ${whereClause}
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as ProjectRow[];

    return {
      items: rows.map((row) => this.mapProject(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  listAccessibleByUserId(userId: string, query: ListProjectsQuery): ProjectListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = ["pm.user_id = ?"];
    const params: unknown[] = [userId];

    if (query.status) {
      conditions.push("p.status = ?");
      params.push(query.status);
    }

    if (query.keyword?.trim()) {
      conditions.push("(p.name LIKE ? OR p.project_key LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const totalRow = this.db
      .prepare(
        `
          SELECT COUNT(DISTINCT p.id) as total
          FROM projects p
          INNER JOIN project_members pm ON pm.project_id = p.id
          ${whereClause}
        `
      )
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT DISTINCT
            p.id,
            p.project_key,
            p.name,
            p.description,
            p.icon,
            p.status,
            p.visibility,
            p.created_at,
            p.updated_at
          FROM projects p
          INNER JOIN project_members pm ON pm.project_id = p.id
          ${whereClause}
          ORDER BY p.updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as ProjectRow[];

    return {
      items: rows.map((row) => this.mapProject(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  listProjectIdsByUserId(userId: string): string[] {
    const rows = this.db
      .prepare(
        `
          SELECT project_id
          FROM project_members
          WHERE user_id = ?
        `
      )
      .all(userId) as Array<{ project_id: string }>;

    return rows.map((row) => row.project_id);
  }

  listAllProjectIds(): string[] {
    const rows = this.db.prepare("SELECT id FROM projects").all() as Array<{ id: string }>;
    return rows.map((row) => row.id);
  }

  listMembers(projectId: string): ProjectMemberEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT * FROM project_members
          WHERE project_id = ?
          ORDER BY is_owner DESC, updated_at DESC
        `
      )
      .all(projectId) as ProjectMemberRow[];

    return rows.map((row) => this.mapMember(row));
  }

  findMemberById(projectId: string, memberId: string): ProjectMemberEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT * FROM project_members
          WHERE project_id = ? AND id = ?
        `
      )
      .get(projectId, memberId) as ProjectMemberRow | undefined;

    return row ? this.mapMember(row) : null;
  }

  hasMember(projectId: string, userId: string): boolean {
    const row = this.db
      .prepare("SELECT 1 as ok FROM project_members WHERE project_id = ? AND user_id = ?")
      .get(projectId, userId) as { ok: number } | undefined;
    return !!row;
  }

  findMemberByProjectAndUserId(projectId: string, userId: string): ProjectMemberEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT * FROM project_members
          WHERE project_id = ? AND user_id = ?
        `
      )
      .get(projectId, userId) as ProjectMemberRow | undefined;

    return row ? this.mapMember(row) : null;
  }

  createMember(entity: ProjectMemberEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO project_members (
          id, project_id, user_id, display_name, role_code, is_owner, joined_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.userId,
        entity.displayName,
        entity.roleCode,
        entity.isOwner ? 1 : 0,
        entity.joinedAt,
        entity.createdAt,
        entity.updatedAt
      );
  }

  deleteMember(projectId: string, memberId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM project_members WHERE project_id = ? AND id = ?")
      .run(projectId, memberId);
    return result.changes > 0;
  }

  private mapProject(row: ProjectRow): ProjectEntity {
    return {
      id: row.id,
      projectKey: row.project_key,
      name: row.name,
      description: row.description,
      icon: row.icon,
      status: row.status,
      visibility: row.visibility,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapMember(row: ProjectMemberRow): ProjectMemberEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      displayName: row.display_name,
      roleCode: row.role_code,
      isOwner: row.is_owner === 1,
      joinedAt: row.joined_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
