import type Database from "better-sqlite3";
import type { IssueBranchEntity, IssueBranchStatus } from "./issue-branch.types";

type IssueBranchRow = {
  id: string;
  issue_id: string;
  owner_user_id: string;
  owner_user_name: string;
  title: string;
  status: IssueBranchStatus;
  summary: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

type UpdateIssueBranchRowInput = Partial<{
  title: string;
  status: IssueBranchStatus;
  summary: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
}>;

export class IssueBranchRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: IssueBranchEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO issue_branches (
            id, issue_id, owner_user_id, owner_user_name, title, status, summary,
            started_at, finished_at, created_by_id, created_by_name, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.issueId,
        entity.ownerUserId,
        entity.ownerUserName,
        entity.title,
        entity.status,
        entity.summary,
        entity.startedAt,
        entity.finishedAt,
        entity.createdById,
        entity.createdByName,
        entity.createdAt,
        entity.updatedAt
      );
  }

  listByIssueId(issueId: string): IssueBranchEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM issue_branches
          WHERE issue_id = ?
          ORDER BY
            CASE status
              WHEN 'in_progress' THEN 0
              WHEN 'todo' THEN 1
              ELSE 2
            END,
            updated_at DESC
        `
      )
      .all(issueId) as IssueBranchRow[];

    return rows.map((row) => this.mapRow(row));
  }

  findById(issueId: string, branchId: string): IssueBranchEntity | null {
    const row = this.db
      .prepare("SELECT * FROM issue_branches WHERE issue_id = ? AND id = ? LIMIT 1")
      .get(issueId, branchId) as IssueBranchRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findLatestOwnUnfinished(issueId: string, ownerUserId: string): IssueBranchEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT *
          FROM issue_branches
          WHERE issue_id = ?
            AND owner_user_id = ?
            AND status IN ('todo', 'in_progress')
          ORDER BY
            CASE status
              WHEN 'in_progress' THEN 0
              ELSE 1
            END,
            updated_at DESC
          LIMIT 1
        `
      )
      .get(issueId, ownerUserId) as IssueBranchRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  update(issueId: string, branchId: string, input: UpdateIssueBranchRowInput): boolean {
    const entries = Object.entries(input);
    if (entries.length === 0) {
      return false;
    }

    const assignments = entries.map(([key]) => `${key} = ?`).join(", ");
    const params = entries.map(([, value]) => value);
    const result = this.db
      .prepare(`UPDATE issue_branches SET ${assignments} WHERE issue_id = ? AND id = ?`)
      .run(...params, issueId, branchId);
    return result.changes > 0;
  }

  private mapRow(row: IssueBranchRow): IssueBranchEntity {
    return {
      id: row.id,
      issueId: row.issue_id,
      ownerUserId: row.owner_user_id,
      ownerUserName: row.owner_user_name,
      title: row.title,
      status: row.status,
      summary: row.summary,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      createdById: row.created_by_id,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
