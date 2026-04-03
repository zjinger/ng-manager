import type Database from "better-sqlite3";

export interface ReportTemplateEntity {
  id: string;
  title: string;
  naturalQuery: string;
  sql: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportTemplateRow {
  id: string;
  title: string;
  natural_query: string;
  sql: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export class AiReportTemplateRepo {
  constructor(private readonly db: Database.Database) {}

  listByCreator(createdBy: string, limit = 100): ReportTemplateEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT id, title, natural_query, sql, created_by, created_at, updated_at
          FROM report_templates
          WHERE created_by = ?
          ORDER BY updated_at DESC
          LIMIT ?
        `
      )
      .all(createdBy, limit) as ReportTemplateRow[];

    return rows.map((row) => this.mapRow(row));
  }

  findDuplicateByTitleAndSql(createdBy: string, title: string, sql: string): ReportTemplateEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT id, title, natural_query, sql, created_by, created_at, updated_at
          FROM report_templates
          WHERE created_by = ? AND title = ? AND sql = ?
          LIMIT 1
        `
      )
      .get(createdBy, title, sql) as ReportTemplateRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  create(entity: ReportTemplateEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO report_templates (
            id, title, natural_query, sql, created_by, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.title,
        entity.naturalQuery,
        entity.sql,
        entity.createdBy,
        entity.createdAt,
        entity.updatedAt
      );
  }

  findByIdAndCreator(id: string, createdBy: string): ReportTemplateEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT id, title, natural_query, sql, created_by, created_at, updated_at
          FROM report_templates
          WHERE id = ? AND created_by = ?
          LIMIT 1
        `
      )
      .get(id, createdBy) as ReportTemplateRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  updateTitleByIdAndCreator(id: string, createdBy: string, title: string, updatedAt: string): boolean {
    const result = this.db
      .prepare(
        `
          UPDATE report_templates
          SET title = ?, updated_at = ?
          WHERE id = ? AND created_by = ?
        `
      )
      .run(title, updatedAt, id, createdBy);

    return result.changes > 0;
  }

  deleteByIdAndCreator(id: string, createdBy: string): boolean {
    const result = this.db
      .prepare("DELETE FROM report_templates WHERE id = ? AND created_by = ?")
      .run(id, createdBy);

    return result.changes > 0;
  }

  private mapRow(row: ReportTemplateRow): ReportTemplateEntity {
    return {
      id: row.id,
      title: row.title,
      naturalQuery: row.natural_query,
      sql: row.sql,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
