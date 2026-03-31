import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  CreateProjectConfigItemInput,
  CreateProjectVersionItemInput,
  ListProjectsQuery,
  ProjectConfigItemEntity,
  ProjectEntity,
  ProjectListResult,
  ProjectMemberCandidate,
  ProjectMemberEntity,
  ProjectMemberRole,
  ProjectVersionItemEntity,
  UpdateProjectConfigItemInput,
  UpdateProjectMemberInput,
  UpdateProjectInput,
  UpdateProjectVersionItemInput
} from "./project.types";

type ProjectRow = {
  id: string;
  project_key: string;
  display_code: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  avatar_upload_id: string | null;
  status: "active" | "inactive";
  visibility: "internal" | "private";
  member_count?: number | null;
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

type UserCandidateRow = {
  id: string;
  username: string;
  display_name: string | null;
  title_code: string | null;
};

type ProjectConfigRow = {
  id: string;
  project_id: string;
  name: string;
  code: string | null;
  enabled: number;
  sort: number;
  desc: string | null;
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
  desc: string | null;
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
    const row = this.db.prepare("SELECT * FROM projects WHERE project_key = ?").get(projectKey) as ProjectRow | undefined;
    return row ? this.mapProject(row) : null;
  }

  findByDisplayCode(displayCode: string): ProjectEntity | null {
    const row = this.db.prepare("SELECT * FROM projects WHERE display_code = ?").get(displayCode) as ProjectRow | undefined;
    return row ? this.mapProject(row) : null;
  }

  create(entity: ProjectEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO projects (
          id, project_key, display_code, name, description, icon, avatar_upload_id, status, visibility, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.projectKey,
        entity.displayCode,
        entity.name,
        entity.description,
        entity.icon,
        entity.avatarUploadId,
        entity.status,
        entity.visibility,
        entity.createdAt,
        entity.updatedAt
      );
  }

  update(id: string, patch: UpdateProjectInput & { updatedAt: string }): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.name !== undefined) {
      fields.push("name = ?");
      params.push(patch.name);
    }
    if (patch.displayCode !== undefined) {
      fields.push("display_code = ?");
      params.push(patch.displayCode ?? null);
    }
    if (patch.description !== undefined) {
      fields.push("description = ?");
      params.push(patch.description ?? null);
    }
    if (patch.icon !== undefined) {
      fields.push("icon = ?");
      params.push(patch.icon ?? null);
    }
    if (patch.avatarUploadId !== undefined) {
      fields.push("avatar_upload_id = ?");
      params.push(patch.avatarUploadId ?? null);
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
          SELECT
            p.*,
            COALESCE(mc.member_count, 0) AS member_count
          FROM projects p
          LEFT JOIN (
            SELECT project_id, COUNT(*) AS member_count
            FROM project_members
            GROUP BY project_id
          ) mc ON mc.project_id = p.id
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

  listAccessibleByUserId(userId: string, query: ListProjectsQuery): ProjectListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = ["(pm.user_id = ? OR p.visibility = 'internal')"];
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
          LEFT JOIN project_members pm ON pm.project_id = p.id
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
            p.display_code,
            p.name,
            p.description,
            p.icon,
            p.avatar_upload_id,
            p.status,
            p.visibility,
            COALESCE(mc.member_count, 0) AS member_count,
            p.created_at,
            p.updated_at
          FROM projects p
          LEFT JOIN project_members pm ON pm.project_id = p.id
          LEFT JOIN (
            SELECT project_id, COUNT(*) AS member_count
            FROM project_members
            GROUP BY project_id
          ) mc ON mc.project_id = p.id
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

  listActiveUserCandidates(): ProjectMemberCandidate[] {
    const rows = this.db
      .prepare(
        `
          SELECT id, username, display_name,title_code
          FROM users
          WHERE status = 'active'
          ORDER BY updated_at DESC, created_at DESC
        `
      )
      .all() as UserCandidateRow[];

    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      titleCode: row.title_code
    }));
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

  updateMember(projectId: string, memberId: string, patch: UpdateProjectMemberInput & { updatedAt: string }): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.roleCode !== undefined) {
      fields.push("role_code = ?");
      params.push(patch.roleCode);
    }
    if (patch.isOwner !== undefined) {
      fields.push("is_owner = ?");
      params.push(patch.isOwner ? 1 : 0);
    }

    if (fields.length === 0) {
      return false;
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);
    params.push(projectId, memberId);

    const result = this.db
      .prepare(`UPDATE project_members SET ${fields.join(", ")} WHERE project_id = ? AND id = ?`)
      .run(...params);
    return result.changes > 0;
  }

  deleteMember(projectId: string, memberId: string): boolean {
    const result = this.db.prepare("DELETE FROM project_members WHERE project_id = ? AND id = ?").run(projectId, memberId);
    return result.changes > 0;
  }

  listModules(projectId: string): ProjectConfigItemEntity[] {
    const rows = this.db
      .prepare(
        `
      SELECT *
      FROM project_modules
      WHERE project_id = ?
      ORDER BY sort ASC, updated_at DESC, created_at DESC
    `
      )
      .all(projectId) as ProjectConfigRow[];

    return rows.map((row) => this.mapConfig(row));
  }

  addModule(projectId: string, input: CreateProjectConfigItemInput & { id: string; createdAt: string; updatedAt: string }): void {
    this.db
      .prepare(
        `
      INSERT INTO project_modules (id, project_id, name, code, enabled, sort, "desc", created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        input.id,
        projectId,
        input.name,
        input.code ?? null,
        input.enabled === false ? 0 : 1,
        input.sort ?? 0,
        input.description?.trim() || null,
        input.createdAt,
        input.updatedAt
      );
  }

  updateModule(projectId: string, moduleId: string, patch: UpdateProjectConfigItemInput & { updatedAt: string }): boolean {
    return this.updateConfigTable("project_modules", projectId, moduleId, patch);
  }

  removeModule(projectId: string, moduleId: string): boolean {
    const result = this.db.prepare("DELETE FROM project_modules WHERE id = ? AND project_id = ?").run(moduleId, projectId);
    return result.changes > 0;
  }

  listEnvironments(projectId: string): ProjectConfigItemEntity[] {
    const rows = this.db
      .prepare(
        `
      SELECT *
      FROM project_environments
      WHERE project_id = ?
      ORDER BY sort ASC, updated_at DESC, created_at DESC
    `
      )
      .all(projectId) as ProjectConfigRow[];

    return rows.map((row) => this.mapConfig(row));
  }

  addEnvironment(
    projectId: string,
    input: CreateProjectConfigItemInput & { id: string; createdAt: string; updatedAt: string }
  ): void {
    this.db
      .prepare(
        `
      INSERT INTO project_environments (id, project_id, name, code, enabled, sort, "desc", created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        input.id,
        projectId,
        input.name,
        input.code ?? null,
        input.enabled === false ? 0 : 1,
        input.sort ?? 0,
        input.description?.trim() || null,
        input.createdAt,
        input.updatedAt
      );
  }

  updateEnvironment(
    projectId: string,
    environmentId: string,
    patch: UpdateProjectConfigItemInput & { updatedAt: string }
  ): boolean {
    return this.updateConfigTable("project_environments", projectId, environmentId, patch);
  }

  removeEnvironment(projectId: string, environmentId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM project_environments WHERE id = ? AND project_id = ?")
      .run(environmentId, projectId);
    return result.changes > 0;
  }

  listVersions(projectId: string): ProjectVersionItemEntity[] {
    const rows = this.db
      .prepare(
        `
      SELECT *
      FROM project_versions
      WHERE project_id = ?
      ORDER BY sort ASC, updated_at DESC, created_at DESC
    `
      )
      .all(projectId) as ProjectVersionRow[];

    return rows.map((row) => this.mapVersion(row));
  }

  addVersion(projectId: string, input: CreateProjectVersionItemInput & { id: string; createdAt: string; updatedAt: string }): void {
    this.db
      .prepare(
        `
      INSERT INTO project_versions (id, project_id, version, code, enabled, sort, "desc", created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        input.id,
        projectId,
        input.version,
        input.code ?? null,
        input.enabled === false ? 0 : 1,
        input.sort ?? 0,
        input.description?.trim() || null,
        input.createdAt,
        input.updatedAt
      );
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
    if (patch.description !== undefined) {
      fields.push(`"desc" = ?`);
      params.push(patch.description ?? null);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);
    params.push(versionId, projectId);

    const result = this.db
      .prepare(
        `
      UPDATE project_versions
      SET ${fields.join(", ")}
      WHERE id = ? AND project_id = ?
    `
      )
      .run(...params);

    return result.changes > 0;
  }

  removeVersion(projectId: string, versionId: string): boolean {
    const result = this.db.prepare("DELETE FROM project_versions WHERE id = ? AND project_id = ?").run(versionId, projectId);
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
    if (patch.description !== undefined) {
      fields.push(`"desc" = ?`);
      params.push(patch.description ?? null);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);
    params.push(itemId, projectId);

    const result = this.db
      .prepare(
        `
      UPDATE ${table}
      SET ${fields.join(", ")}
      WHERE id = ? AND project_id = ?
    `
      )
      .run(...params);

    return result.changes > 0;
  }

  private mapProject(row: ProjectRow): ProjectEntity {
    return {
      id: row.id,
      projectKey: row.project_key,
      displayCode: row.display_code,
      name: row.name,
      description: row.description,
      icon: row.icon,
      avatarUploadId: row.avatar_upload_id ?? null,
      avatarUrl: row.avatar_upload_id ? `/api/admin/uploads/${row.avatar_upload_id}/raw` : null,
      memberCount: Number(row.member_count ?? 0),
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
      roleCode: this.mapMemberRole(row.role_code),
      isOwner: row.is_owner === 1,
      joinedAt: row.joined_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapConfig(row: ProjectConfigRow): ProjectConfigItemEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      code: row.code,
      enabled: row.enabled === 1,
      sort: row.sort,
      description: row.desc,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapVersion(row: ProjectVersionRow): ProjectVersionItemEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      version: row.version,
      code: row.code,
      enabled: row.enabled === 1,
      sort: row.sort,
      description: row.desc,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapMemberRole(value: string): ProjectMemberRole {
    const role = value.trim();
    if (
      role === "member" ||
      role === "product" ||
      role === "ui" ||
      role === "frontend_dev" ||
      role === "backend_dev" ||
      role === "qa" ||
      role === "ops" ||
      role === "project_admin"
    ) {
      return role;
    }
    return "member";
  }
}
