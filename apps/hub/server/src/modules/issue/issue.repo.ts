import type Database from "better-sqlite3";
import type { IssueEntity, IssueListResult, IssueStatus, ListIssuesQuery, UpdateIssuePatch } from "./issue.types";

type IssueRow = {
  id: string;
  project_id: string;
  issue_no: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  reporter_id: string;
  reporter_name: string;
  assignee_id: string | null;
  assignee_name: string | null;
  reopen_count: number;
  module_code: string | null;
  version_code: string | null;
  environment_code: string | null;
  resolution_summary: string | null;
  close_reason: string | null;
  close_remark: string | null;
  started_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export class IssueRepo {
  constructor(private readonly db: Database.Database) {}

  runInTransaction<T>(handler: () => T): T {
    const tx = this.db.transaction(handler);
    return tx();
  }

  create(entity: IssueEntity): void {
    this.db.prepare(`
      INSERT INTO issues (
        id, project_id, issue_no, title, description, type, status, priority,
        reporter_id, reporter_name, assignee_id, assignee_name, reopen_count,
        module_code, version_code, environment_code, resolution_summary,
        close_reason, close_remark, started_at, resolved_at, closed_at, created_at, updated_at
      ) VALUES (
        @id, @project_id, @issue_no, @title, @description, @type, @status, @priority,
        @reporter_id, @reporter_name, @assignee_id, @assignee_name, @reopen_count,
        @module_code, @version_code, @environment_code, @resolution_summary,
        @close_reason, @close_remark, @started_at, @resolved_at, @closed_at, @created_at, @updated_at
      )
    `).run(this.toDbEntity(entity));
  }

  findById(projectId: string, issueId: string): IssueEntity | null {
    const row = this.db.prepare(`SELECT * FROM issues WHERE project_id = ? AND id = ? LIMIT 1`).get(projectId, issueId) as IssueRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  update(projectId: string, issueId: string, patch: UpdateIssuePatch): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];
    const mapper: Array<[keyof UpdateIssuePatch, string]> = [
      ["title", "title"],
      ["description", "description"],
      ["type", "type"],
      ["priority", "priority"],
      ["assigneeId", "assignee_id"],
      ["assigneeName", "assignee_name"],
      ["moduleCode", "module_code"],
      ["versionCode", "version_code"],
      ["environmentCode", "environment_code"],
      ["resolutionSummary", "resolution_summary"],
      ["closeReason", "close_reason"],
      ["closeRemark", "close_remark"],
      ["startedAt", "started_at"],
      ["resolvedAt", "resolved_at"],
      ["closedAt", "closed_at"],
      ["status", "status"],
      ["reopenCount", "reopen_count"],
      ["updatedAt", "updated_at"]
    ];

    for (const [key, column] of mapper) {
      if (patch[key] !== undefined) {
        fields.push(`${column} = ?`);
        params.push(patch[key] ?? null);
      }
    }

    if (!fields.length) {
      return true;
    }

    params.push(projectId, issueId);
    const result = this.db.prepare(`
      UPDATE issues
      SET ${fields.join(", ")}
      WHERE project_id = ? AND id = ?
    `).run(...params);
    return result.changes > 0;
  }

  list(query: ListIssuesQuery): IssueListResult {
    const conditions = ["project_id = ?"];
    const params: unknown[] = [query.projectId];

    if (query.status) {
      this.appendStatusCondition(conditions, params, query.status);
    }
    if (query.priority) {
      conditions.push("priority = ?");
      params.push(query.priority);
    }
    if (query.type) {
      conditions.push("type = ?");
      params.push(query.type);
    }
    if (query.assigneeId) {
      conditions.push("assignee_id = ?");
      params.push(query.assigneeId);
    }
    if (query.keyword) {
      conditions.push("(issue_no LIKE ? OR title LIKE ? OR description LIKE ?)");
      const keyword = `%${query.keyword}%`;
      params.push(keyword, keyword, keyword);
    }

    const whereSql = `WHERE ${conditions.join(" AND ")}`;
    const totalRow = this.db.prepare(`SELECT COUNT(1) AS total FROM issues ${whereSql}`).get(...params) as { total: number };
    const offset = (query.page - 1) * query.pageSize;
    const rows = this.db.prepare(`
      SELECT *
      FROM issues
      ${whereSql}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, query.pageSize, offset) as IssueRow[];

    return {
      items: rows.map((row) => this.toEntity(row)),
      page: query.page,
      pageSize: query.pageSize,
      total: totalRow.total
    };
  }

  private appendStatusCondition(conditions: string[], params: unknown[], status: IssueStatus): void {
    if (status === "verified") {
      conditions.push("(status = ? OR (status = ? AND close_remark = ?))");
      params.push("verified", "closed", "verified_passed");
      return;
    }
    if (status === "closed") {
      conditions.push("(status = ? AND (close_remark IS NULL OR close_remark <> ?))");
      params.push("closed", "verified_passed");
      return;
    }
    conditions.push("status = ?");
    params.push(status);
  }

  private toDbEntity(entity: IssueEntity) {
    return {
      id: entity.id,
      project_id: entity.projectId,
      issue_no: entity.issueNo,
      title: entity.title,
      description: entity.description,
      type: entity.type,
      status: entity.status,
      priority: entity.priority,
      reporter_id: entity.reporterId,
      reporter_name: entity.reporterName,
      assignee_id: entity.assigneeId ?? null,
      assignee_name: entity.assigneeName ?? null,
      reopen_count: entity.reopenCount,
      module_code: entity.moduleCode ?? null,
      version_code: entity.versionCode ?? null,
      environment_code: entity.environmentCode ?? null,
      resolution_summary: entity.resolutionSummary ?? null,
      close_reason: entity.closeReason ?? null,
      close_remark: entity.closeRemark ?? null,
      started_at: entity.startedAt ?? null,
      resolved_at: entity.resolvedAt ?? null,
      closed_at: entity.closedAt ?? null,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    };
  }

  private toEntity(row: IssueRow): IssueEntity {
    const normalizedStatus = this.normalizeStatus(row.status, row.close_remark);
    return {
      id: row.id,
      projectId: row.project_id,
      issueNo: row.issue_no,
      title: row.title,
      description: row.description,
      type: row.type as IssueEntity["type"],
      status: normalizedStatus,
      priority: row.priority as IssueEntity["priority"],
      reporterId: row.reporter_id,
      reporterName: row.reporter_name,
      assigneeId: row.assignee_id,
      assigneeName: row.assignee_name,
      reopenCount: row.reopen_count,
      moduleCode: row.module_code,
      versionCode: row.version_code,
      environmentCode: row.environment_code,
      resolutionSummary: row.resolution_summary,
      closeReason: row.close_reason,
      closeRemark: row.close_remark,
      startedAt: row.started_at,
      resolvedAt: row.resolved_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private normalizeStatus(status: string, closeRemark: string | null): IssueStatus {
    if (status === "closed" && closeRemark === "verified_passed") {
      return "verified";
    }
    return status as IssueStatus;
  }
}
