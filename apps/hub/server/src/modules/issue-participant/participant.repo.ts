import type Database from "better-sqlite3";
import type { IssueParticipantEntity } from "./participant.types";

type IssueParticipantRow = {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  created_at: string;
};

export class IssueParticipantRepo {
  constructor(private readonly db: Database.Database) {}

  listByIssueId(issueId: string): IssueParticipantEntity[] {
    const rows = this.db.prepare(`
      SELECT id, issue_id, user_id, user_name, created_at
      FROM issue_participants
      WHERE issue_id = ?
      ORDER BY created_at ASC
    `).all(issueId) as IssueParticipantRow[];
    return rows.map((row) => this.toEntity(row));
  }

  listByIssueIds(issueIds: string[]): IssueParticipantEntity[] {
    if (issueIds.length === 0) {
      return [];
    }

    const placeholders = issueIds.map(() => '?').join(', ');
    const rows = this.db.prepare(`
      SELECT id, issue_id, user_id, user_name, created_at
      FROM issue_participants
      WHERE issue_id IN (${placeholders})
      ORDER BY created_at ASC
    `).all(...issueIds) as IssueParticipantRow[];

    return rows.map((row) => this.toEntity(row));
  }

  findByIssueIdAndUserId(issueId: string, userId: string): IssueParticipantEntity | null {
    const row = this.db.prepare(`
      SELECT id, issue_id, user_id, user_name, created_at
      FROM issue_participants
      WHERE issue_id = ? AND user_id = ?
      LIMIT 1
    `).get(issueId, userId) as IssueParticipantRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  hasParticipant(issueId: string, userId: string): boolean {
    const row = this.db.prepare(`SELECT 1 AS hit FROM issue_participants WHERE issue_id = ? AND user_id = ? LIMIT 1`).get(issueId, userId) as { hit: number } | undefined;
    return !!row;
  }

  create(entity: IssueParticipantEntity): void {
    this.db.prepare(`
      INSERT INTO issue_participants (id, issue_id, user_id, user_name, created_at)
      VALUES (@id, @issue_id, @user_id, @user_name, @created_at)
    `).run({
      id: entity.id,
      issue_id: entity.issueId,
      user_id: entity.userId,
      user_name: entity.userName,
      created_at: entity.createdAt
    });
  }

  delete(issueId: string, userId: string): boolean {
    const result = this.db.prepare(`DELETE FROM issue_participants WHERE issue_id = ? AND user_id = ?`).run(issueId, userId);
    return result.changes > 0;
  }

  private toEntity(row: IssueParticipantRow): IssueParticipantEntity {
    return {
      id: row.id,
      issueId: row.issue_id,
      userId: row.user_id,
      userName: row.user_name,
      createdAt: row.created_at
    };
  }
}
