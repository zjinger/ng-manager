import type Database from "better-sqlite3";
import type { IssueCommentEntity, IssueCommentMentionEntity } from "./comment.types";

type IssueCommentRow = {
  id: string;
  issue_id: string;
  author_id: string | null;
  author_name: string | null;
  content: string;
  mentions_json: string;
  created_at: string;
  updated_at: string;
};

export class IssueCommentRepo {
  constructor(private readonly db: Database.Database) {}

  listByIssueId(issueId: string): IssueCommentEntity[] {
    const rows = this.db.prepare(`
      SELECT id, issue_id, author_id, author_name, content, mentions_json, created_at, updated_at
      FROM issue_comments
      WHERE issue_id = ?
      ORDER BY created_at ASC, id ASC
    `).all(issueId) as IssueCommentRow[];
    return rows.map((row) => this.toEntity(row));
  }

  create(entity: IssueCommentEntity): void {
    this.db.prepare(`
      INSERT INTO issue_comments (
        id, issue_id, author_id, author_name, content, mentions_json, created_at, updated_at
      ) VALUES (
        @id, @issue_id, @author_id, @author_name, @content, @mentions_json, @created_at, @updated_at
      )
    `).run({
      id: entity.id,
      issue_id: entity.issueId,
      author_id: entity.authorId ?? null,
      author_name: entity.authorName ?? null,
      content: entity.content,
      mentions_json: JSON.stringify(entity.mentions ?? []),
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    });
  }

  private toEntity(row: IssueCommentRow): IssueCommentEntity {
    let mentions: IssueCommentMentionEntity[] = [];
    try {
      const value = JSON.parse(row.mentions_json || "[]");
      if (Array.isArray(value)) {
        mentions = value.filter((item) => item && typeof item.userId === "string" && typeof item.displayName === "string");
      }
    } catch {
      mentions = [];
    }

    return {
      id: row.id,
      issueId: row.issue_id,
      authorId: row.author_id,
      authorName: row.author_name,
      content: row.content,
      mentions,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
