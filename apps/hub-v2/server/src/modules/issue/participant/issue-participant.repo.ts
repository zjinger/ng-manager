import type Database from "better-sqlite3";
import type { IssueParticipantEntity } from "./issue-participant.types";

type IssueParticipantRow = {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  created_at: string;
};

export class IssueParticipantRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: IssueParticipantEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO issue_participants (id, issue_id, user_id, user_name, created_at)
          VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(entity.id, entity.issueId, entity.userId, entity.userName, entity.createdAt);
  }

  findById(issueId: string, participantId: string): IssueParticipantEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT * FROM issue_participants
          WHERE issue_id = ? AND id = ?
        `
      )
      .get(issueId, participantId) as IssueParticipantRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  exists(issueId: string, userId: string): boolean {
    const row = this.db
      .prepare("SELECT 1 as ok FROM issue_participants WHERE issue_id = ? AND user_id = ?")
      .get(issueId, userId) as { ok: number } | undefined;
    return !!row;
  }

  listByIssueId(issueId: string): IssueParticipantEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT * FROM issue_participants
          WHERE issue_id = ?
          ORDER BY created_at ASC
        `
      )
      .all(issueId) as IssueParticipantRow[];

    return rows.map((row) => this.mapRow(row));
  }

  delete(issueId: string, participantId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM issue_participants WHERE issue_id = ? AND id = ?")
      .run(issueId, participantId);
    return result.changes > 0;
  }

  private mapRow(row: IssueParticipantRow): IssueParticipantEntity {
    return {
      id: row.id,
      issueId: row.issue_id,
      userId: row.user_id,
      userName: row.user_name,
      createdAt: row.created_at
    };
  }
}
