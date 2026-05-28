import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  DeliveryWeeklyReportEntity,
  DeliveryWeeklyReportListResult,
  ListDeliveryWeeklyReportsQuery
} from "./delivery-weekly-report.types";

type DeliveryWeeklyReportRow = {
  id: string;
  project_id: string;
  project_key: string;
  project_name: string;
  period_start: string;
  period_end: string;
  title: string;
  summary_json: string;
  metrics_json: string;
  stages_json: string;
  key_items_json: string;
  attentions_json: string;
  created_by_id: string;
  created_by_name: string | null;
  created_at: string;
};

export class DeliveryWeeklyReportRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: DeliveryWeeklyReportEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO delivery_weekly_reports (
            id, project_id, project_key, project_name, period_start, period_end, title,
            summary_json, metrics_json, stages_json, key_items_json, attentions_json,
            created_by_id, created_by_name, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.projectKey,
        entity.projectName,
        entity.periodStart,
        entity.periodEnd,
        entity.title,
        JSON.stringify(entity.summary),
        JSON.stringify(entity.metrics),
        JSON.stringify(entity.stages),
        JSON.stringify(entity.keyItems),
        JSON.stringify(entity.attentions),
        entity.createdById,
        entity.createdByName,
        entity.createdAt
      );
  }

  findById(id: string): DeliveryWeeklyReportEntity | null {
    const row = this.db
      .prepare("SELECT * FROM delivery_weekly_reports WHERE id = ?")
      .get(id) as DeliveryWeeklyReportRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  deleteById(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM delivery_weekly_reports WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  list(query: ListDeliveryWeeklyReportsQuery): DeliveryWeeklyReportListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const projectId = query.projectId.trim();
    const totalRow = this.db
      .prepare("SELECT COUNT(*) as total FROM delivery_weekly_reports WHERE project_id = ?")
      .get(projectId) as { total: number };
    const rows = this.db
      .prepare(
        `
          SELECT * FROM delivery_weekly_reports
          WHERE project_id = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(projectId, pageSize, offset) as DeliveryWeeklyReportRow[];

    return {
      items: rows.map((row) => this.mapRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  private mapRow(row: DeliveryWeeklyReportRow): DeliveryWeeklyReportEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      projectKey: row.project_key,
      projectName: row.project_name,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      title: row.title,
      summary: this.parseJson(row.summary_json),
      metrics: this.parseJson(row.metrics_json),
      stages: this.parseJson(row.stages_json),
      keyItems: this.parseJson(row.key_items_json),
      attentions: this.parseJson(row.attentions_json),
      createdById: row.created_by_id,
      createdByName: row.created_by_name,
      createdAt: row.created_at
    };
  }

  private parseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}
