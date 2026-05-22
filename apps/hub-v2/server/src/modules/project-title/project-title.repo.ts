import type Database from "better-sqlite3";
import type { ListProjectTitlesQuery, ProjectTitleEntity, ProjectTitleStatus } from "./project-title.types";

type ProjectTitleRow = {
  id: string;
  code: string;
  name: string;
  status: ProjectTitleStatus;
  sort: number;
  remark: string | null;
  created_at: string;
  updated_at: string;
};

export class ProjectTitleRepo {
  constructor(private readonly db: Database.Database) {}

  listTitles(query: ListProjectTitlesQuery = {}): ProjectTitleEntity[] {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      conditions.push("(code LIKE ? OR name LIKE ?)");
      params.push(keyword, keyword);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(
        `SELECT id, code, name, status, sort, remark, created_at, updated_at FROM project_titles ${whereClause} ORDER BY sort ASC, name ASC, created_at DESC`
      )
      .all(...params) as ProjectTitleRow[];
    return rows.map((row) => this.mapRow(row));
  }

  findById(id: string): ProjectTitleEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, status, sort, remark, created_at, updated_at FROM project_titles WHERE id = ?")
      .get(id) as ProjectTitleRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findByCode(code: string): ProjectTitleEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, status, sort, remark, created_at, updated_at FROM project_titles WHERE code = ?")
      .get(code) as ProjectTitleRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  create(entity: ProjectTitleEntity): void {
    this.db
      .prepare("INSERT INTO project_titles (id, code, name, status, sort, remark, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(entity.id, entity.code, entity.name, entity.status, entity.sort, entity.remark, entity.createdAt, entity.updatedAt);
  }

  update(entity: ProjectTitleEntity): void {
    this.db
      .prepare("UPDATE project_titles SET code = ?, name = ?, status = ?, sort = ?, remark = ?, updated_at = ? WHERE id = ?")
      .run(entity.code, entity.name, entity.status, entity.sort, entity.remark, entity.updatedAt, entity.id);
  }

  delete(id: string): void {
    this.db.prepare("DELETE FROM project_titles WHERE id = ?").run(id);
  }

  countProjectMembersByRoleCode(code: string): number {
    const row = this.db.prepare("SELECT COUNT(*) AS cnt FROM project_members WHERE role_code = ?").get(code) as { cnt: number };
    return row.cnt;
  }

  countUsersByDefaultProjectTitleCode(code: string): number {
    const row = this.db.prepare("SELECT COUNT(*) AS cnt FROM users WHERE default_project_title_code = ?").get(code) as {
      cnt: number;
    };
    return row.cnt;
  }

  private mapRow(row: ProjectTitleRow): ProjectTitleEntity {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      status: row.status,
      sort: row.sort,
      remark: row.remark,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
