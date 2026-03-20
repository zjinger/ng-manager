import type Database from "better-sqlite3";
import type { IssueCommentEntity } from "./issue-comment.types";

type IssueCommentRow = {
  id: string;
  issue_id: string;
  author_id: string;
  author_name: string;
  content: string;
  mentions_json: string | null;
  created_at: string;
  updated_at: string;
};

export class IssueCommentRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: IssueCommentEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO issue_comments (
            id, issue_id, author_id, author_name, content, mentions_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.issueId,
        entity.authorId,
        entity.authorName,
        entity.content,
        entity.mentionsJson,
        entity.createdAt,
        entity.updatedAt
      );
  }

  listByIssueId(issueId: string): IssueCommentEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT * FROM issue_comments
          WHERE issue_id = ?
          ORDER BY created_at ASC
        `
      )
      .all(issueId) as IssueCommentRow[];

    return rows.map((row) => ({
      id: row.id,
      issueId: row.issue_id,
      authorId: row.author_id,
      authorName: row.author_name,
      content: row.content,
      mentionsJson: row.mentions_json,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
}
