import type Database from "better-sqlite3";
import type { ListOrganizationTitlesQuery, OrganizationTitleEntity, OrganizationTitleStatus } from "./organization-title.types";

type OrganizationTitleRow = {
  id: string;
  code: string;
  name: string;
  status: OrganizationTitleStatus;
  sort: number;
  remark: string | null;
  created_at: string;
  updated_at: string;
};

export class OrganizationTitleRepo {
  constructor(private readonly db: Database.Database) {}

  listTitles(query: ListOrganizationTitlesQuery = {}): OrganizationTitleEntity[] {
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
        `SELECT id, code, name, status, sort, remark, created_at, updated_at FROM organization_titles ${whereClause} ORDER BY sort ASC, name ASC, created_at DESC`
      )
      .all(...params) as OrganizationTitleRow[];
    return rows.map((row) => this.mapRow(row));
  }

  findById(id: string): OrganizationTitleEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, status, sort, remark, created_at, updated_at FROM organization_titles WHERE id = ?")
      .get(id) as OrganizationTitleRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findByCode(code: string): OrganizationTitleEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, status, sort, remark, created_at, updated_at FROM organization_titles WHERE code = ?")
      .get(code) as OrganizationTitleRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  create(entity: OrganizationTitleEntity): void {
    this.db
      .prepare("INSERT INTO organization_titles (id, code, name, status, sort, remark, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(entity.id, entity.code, entity.name, entity.status, entity.sort, entity.remark, entity.createdAt, entity.updatedAt);
  }

  update(entity: OrganizationTitleEntity): void {
    this.db
      .prepare("UPDATE organization_titles SET code = ?, name = ?, status = ?, sort = ?, remark = ?, updated_at = ? WHERE id = ?")
      .run(entity.code, entity.name, entity.status, entity.sort, entity.remark, entity.updatedAt, entity.id);
  }

  delete(id: string): void {
    this.db.prepare("DELETE FROM organization_titles WHERE id = ?").run(id);
  }

  countUsersByTitleCode(code: string): number {
    const row = this.db.prepare("SELECT COUNT(*) AS cnt FROM users WHERE organization_title_code = ?").get(code) as { cnt: number };
    return row.cnt;
  }

  countDepartmentBindingsByTitleCode(code: string): number {
    const row = this.db.prepare("SELECT COUNT(*) AS cnt FROM department_titles WHERE organization_title_code = ?").get(code) as { cnt: number };
    return row.cnt;
  }

  private mapRow(row: OrganizationTitleRow): OrganizationTitleEntity {
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
