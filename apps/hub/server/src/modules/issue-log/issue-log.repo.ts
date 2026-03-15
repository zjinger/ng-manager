import type Database from "better-sqlite3";
import type { CreateIssueActionLogInput, IssueActionLogEntity } from "./issue-log.types";

type IssueActionLogRow = {
  id: string;
  issue_id: string;
  action_type: string;
  from_status: string | null;
  to_status: string | null;
  operator_id: string | null;
  operator_name: string | null;
  summary: string | null;
  created_at: string;
};

export class IssueLogRepo {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateIssueActionLogInput): void {
    this.db.prepare(`
      INSERT INTO issue_action_logs (
        id, issue_id, action_type, from_status, to_status, operator_id, operator_name, summary, created_at
      ) VALUES (
        @id, @issue_id, @action_type, @from_status, @to_status, @operator_id, @operator_name, @summary, @created_at
      )
    `).run({
      id: input.id,
      issue_id: input.issueId,
      action_type: input.actionType,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus ?? null,
      operator_id: input.operatorId ?? null,
      operator_name: input.operatorName ?? null,
      summary: input.summary ?? null,
      created_at: input.createdAt
    });
  }

  listByIssueId(issueId: string): IssueActionLogEntity[] {
    const rows = this.db.prepare(`
      SELECT id, issue_id, action_type, from_status, to_status, operator_id, operator_name, summary, created_at
      FROM issue_action_logs
      WHERE issue_id = ?
      ORDER BY created_at DESC, id DESC
    `).all(issueId) as IssueActionLogRow[];
    return rows.map((row) => ({
      id: row.id,
      issueId: row.issue_id,
      actionType: row.action_type as IssueActionLogEntity["actionType"],
      fromStatus: row.from_status as IssueActionLogEntity["fromStatus"],
      toStatus: row.to_status as IssueActionLogEntity["toStatus"],
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      summary: row.summary,
      createdAt: row.created_at
    }));
  }
}
