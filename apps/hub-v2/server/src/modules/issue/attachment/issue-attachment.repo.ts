import type Database from "better-sqlite3";

type IssueAttachmentRow = {
  id: string;
  issue_id: string;
  upload_id: string;
  created_at: string;
};

export interface IssueAttachmentRecord {
  id: string;
  issueId: string;
  uploadId: string;
  createdAt: string;
}

export class IssueAttachmentRepo {
  constructor(private readonly db: Database.Database) {}

  create(record: IssueAttachmentRecord): void {
    this.db
      .prepare(
        `
          INSERT INTO issue_attachments (id, issue_id, upload_id, created_at)
          VALUES (?, ?, ?, ?)
        `
      )
      .run(record.id, record.issueId, record.uploadId, record.createdAt);
  }

  findById(issueId: string, attachmentId: string): IssueAttachmentRecord | null {
    const row = this.db
      .prepare(
        `
          SELECT * FROM issue_attachments
          WHERE issue_id = ? AND id = ?
        `
      )
      .get(issueId, attachmentId) as IssueAttachmentRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  exists(issueId: string, uploadId: string): boolean {
    const row = this.db
      .prepare("SELECT 1 as ok FROM issue_attachments WHERE issue_id = ? AND upload_id = ?")
      .get(issueId, uploadId) as { ok: number } | undefined;
    return !!row;
  }

  listByIssueId(issueId: string): IssueAttachmentRecord[] {
    const rows = this.db
      .prepare(
        `
          SELECT * FROM issue_attachments
          WHERE issue_id = ?
          ORDER BY created_at ASC
        `
      )
      .all(issueId) as IssueAttachmentRow[];

    return rows.map((row) => this.mapRow(row));
  }

  delete(issueId: string, attachmentId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM issue_attachments WHERE issue_id = ? AND id = ?")
      .run(issueId, attachmentId);
    return result.changes > 0;
  }

  countByUploadId(uploadId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(1) as total FROM issue_attachments WHERE upload_id = ?")
      .get(uploadId) as { total: number } | undefined;
    return row?.total ?? 0;
  }

  private mapRow(row: IssueAttachmentRow): IssueAttachmentRecord {
    return {
      id: row.id,
      issueId: row.issue_id,
      uploadId: row.upload_id,
      createdAt: row.created_at
    };
  }
}
