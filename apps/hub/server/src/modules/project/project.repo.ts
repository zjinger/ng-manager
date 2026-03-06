import type Database from "better-sqlite3";
import type {
  ListProjectQuery,
  ProjectEntity,
  ProjectListResult,
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

export class ProjectRepo {
  constructor(private readonly db: Database.Database) {}

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
}