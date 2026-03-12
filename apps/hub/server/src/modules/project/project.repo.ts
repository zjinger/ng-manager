import type Database from "better-sqlite3";
import type {
  CreateProjectConfigItemInput,
  CreateProjectVersionItemInput,
  ListProjectQuery,
  ProjectConfigItemEntity,
  ProjectEntity,
  ProjectListItem,
  ProjectListResult,
  ProjectVersionItemEntity,
  UpdateProjectConfigItemInput,
  UpdateProjectInput,
  UpdateProjectVersionItemInput
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
  member_count?: number;
};

type ProjectConfigRow = {
  id: string;
  project_id: string;
  name: string;
  code: string | null;
  enabled: number;
  sort: number;
  created_at: string;
  updated_at: string;
};

type ProjectVersionRow = {
  id: string;
  project_id: string;
  version: string;
  code: string | null;
  enabled: number;
  sort: number;
  created_at: string;
  updated_at: string;
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
    const row = this.db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as ProjectRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  findByKey(projectKey: string): ProjectEntity | null {
    const row = this.db.prepare(`SELECT * FROM projects WHERE project_key = ?`).get(projectKey) as ProjectRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  findByName(name: string): ProjectEntity | null {
    const row = this.db.prepare(`SELECT * FROM projects WHERE lower(name) = lower(?) LIMIT 1`).get(name) as ProjectRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  findPublicByKey(projectKey: string): ProjectEntity | null {
    const row = this.db.prepare(`
      SELECT *
      FROM projects
      WHERE project_key = ?
        AND status = 'active'
        AND visibility = 'public'
    `).get(projectKey) as ProjectRow | undefined;

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

    const result = this.db.prepare(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`).run(...params);
    return result.changes > 0;
  }

  remove(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  list(query: ListProjectQuery): ProjectListResult {
    const where: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      where.push("p.status = ?");
      params.push(query.status);
    }
    if (query.visibility) {
      where.push("p.visibility = ?");
      params.push(query.visibility);
    }
    if (query.keyword) {
      where.push("(p.project_key LIKE ? OR p.name LIKE ? OR p.description LIKE ?)");
      params.push(`%${query.keyword}%`, `%${query.keyword}%`, `%${query.keyword}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (query.page - 1) * query.pageSize;

    const totalRow = this.db.prepare(`SELECT COUNT(*) AS total FROM projects p ${whereSql}`).get(...params) as { total: number };

    const rows = this.db.prepare(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count
      FROM projects p
      ${whereSql}
      ORDER BY p.updated_at DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, query.pageSize, offset) as ProjectRow[];

    return {
      items: rows.map((row) => this.toListItem(row)),
      page: query.page,
      pageSize: query.pageSize,
      total: totalRow.total
    };
  }

  listPublicActive(): ProjectEntity[] {
    const rows = this.db.prepare(`
      SELECT *
      FROM projects
      WHERE status = 'active' AND visibility = 'public'
      ORDER BY name ASC, created_at DESC
    `).all() as ProjectRow[];

    return rows.map((row) => this.toEntity(row));
  }

  listModules(projectId: string): ProjectConfigItemEntity[] {
    const rows = this.db.prepare(`
      SELECT *
      FROM project_modules
      WHERE project_id = ?
      ORDER BY sort ASC, updated_at DESC, created_at DESC
    `).all(projectId) as ProjectConfigRow[];

    return rows.map((row) => this.toConfigEntity(row));
  }

  addModule(projectId: string, input: CreateProjectConfigItemInput & { id: string; createdAt: string; updatedAt: string }): void {
    this.db.prepare(`
      INSERT INTO project_modules (id, project_id, name, code, enabled, sort, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(input.id, projectId, input.name, input.code ?? null, input.enabled === false ? 0 : 1, input.sort ?? 0, input.createdAt, input.updatedAt);
  }

  updateModule(projectId: string, moduleId: string, patch: UpdateProjectConfigItemInput & { updatedAt: string }): boolean {
    return this.updateConfigTable("project_modules", projectId, moduleId, patch);
  }

  removeModule(projectId: string, moduleId: string): boolean {
    const result = this.db.prepare(`DELETE FROM project_modules WHERE id = ? AND project_id = ?`).run(moduleId, projectId);
    return result.changes > 0;
  }

  listEnvironments(projectId: string): ProjectConfigItemEntity[] {
    const rows = this.db.prepare(`
      SELECT *
      FROM project_environments
      WHERE project_id = ?
      ORDER BY sort ASC, updated_at DESC, created_at DESC
    `).all(projectId) as ProjectConfigRow[];

    return rows.map((row) => this.toConfigEntity(row));
  }

  addEnvironment(projectId: string, input: CreateProjectConfigItemInput & { id: string; createdAt: string; updatedAt: string }): void {
    this.db.prepare(`
      INSERT INTO project_environments (id, project_id, name, code, enabled, sort, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(input.id, projectId, input.name, input.code ?? null, input.enabled === false ? 0 : 1, input.sort ?? 0, input.createdAt, input.updatedAt);
  }

  updateEnvironment(projectId: string, environmentId: string, patch: UpdateProjectConfigItemInput & { updatedAt: string }): boolean {
    return this.updateConfigTable("project_environments", projectId, environmentId, patch);
  }

  removeEnvironment(projectId: string, environmentId: string): boolean {
    const result = this.db.prepare(`DELETE FROM project_environments WHERE id = ? AND project_id = ?`).run(environmentId, projectId);
    return result.changes > 0;
  }

  listVersions(projectId: string): ProjectVersionItemEntity[] {
    const rows = this.db.prepare(`
      SELECT *
      FROM project_versions
      WHERE project_id = ?
      ORDER BY sort ASC, updated_at DESC, created_at DESC
    `).all(projectId) as ProjectVersionRow[];

    return rows.map((row) => this.toVersionEntity(row));
  }

  addVersion(projectId: string, input: CreateProjectVersionItemInput & { id: string; createdAt: string; updatedAt: string }): void {
    this.db.prepare(`
      INSERT INTO project_versions (id, project_id, version, code, enabled, sort, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(input.id, projectId, input.version, input.code ?? null, input.enabled === false ? 0 : 1, input.sort ?? 0, input.createdAt, input.updatedAt);
  }

  updateVersion(projectId: string, versionId: string, patch: UpdateProjectVersionItemInput & { updatedAt: string }): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.version !== undefined) {
      fields.push("version = ?");
      params.push(patch.version);
    }
    if (patch.code !== undefined) {
      fields.push("code = ?");
      params.push(patch.code ?? null);
    }
    if (patch.enabled !== undefined) {
      fields.push("enabled = ?");
      params.push(patch.enabled ? 1 : 0);
    }
    if (patch.sort !== undefined) {
      fields.push("sort = ?");
      params.push(patch.sort);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);
    params.push(versionId, projectId);

    const result = this.db.prepare(`
      UPDATE project_versions
      SET ${fields.join(", ")}
      WHERE id = ? AND project_id = ?
    `).run(...params);

    return result.changes > 0;
  }

  removeVersion(projectId: string, versionId: string): boolean {
    const result = this.db.prepare(`DELETE FROM project_versions WHERE id = ? AND project_id = ?`).run(versionId, projectId);
    return result.changes > 0;
  }

  private updateConfigTable(
    table: "project_modules" | "project_environments",
    projectId: string,
    itemId: string,
    patch: UpdateProjectConfigItemInput & { updatedAt: string }
  ): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.name !== undefined) {
      fields.push("name = ?");
      params.push(patch.name);
    }
    if (patch.code !== undefined) {
      fields.push("code = ?");
      params.push(patch.code ?? null);
    }
    if (patch.enabled !== undefined) {
      fields.push("enabled = ?");
      params.push(patch.enabled ? 1 : 0);
    }
    if (patch.sort !== undefined) {
      fields.push("sort = ?");
      params.push(patch.sort);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);
    params.push(itemId, projectId);

    const result = this.db.prepare(`
      UPDATE ${table}
      SET ${fields.join(", ")}
      WHERE id = ? AND project_id = ?
    `).run(...params);

    return result.changes > 0;
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

  private toListItem(row: ProjectRow): ProjectListItem {
    return {
      ...this.toEntity(row),
      memberCount: row.member_count ?? 0
    };
  }

  private toConfigEntity(row: ProjectConfigRow): ProjectConfigItemEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      code: row.code,
      enabled: row.enabled === 1,
      sort: row.sort,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private toVersionEntity(row: ProjectVersionRow): ProjectVersionItemEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      version: row.version,
      code: row.code,
      enabled: row.enabled === 1,
      sort: row.sort,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
