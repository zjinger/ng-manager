import type Database from "better-sqlite3";
import type { IssueAttachmentEntity } from "./attachment.types";

type IssueAttachmentRow = {
  id: string;
  issue_id: string;
  upload_id: string;
  file_name: string;
  original_name: string;
  mime_type: string | null;
  file_ext: string | null;
  file_size: number;
  storage_path: string;
  storage_provider: string;
  uploader_id: string | null;
  uploader_name: string | null;
  created_at: string;
};

export class IssueAttachmentRepo {
  constructor(private readonly db: Database.Database) {}

  listByIssueId(issueId: string): IssueAttachmentEntity[] {
    const rows = this.db.prepare(`
      SELECT ia.id, ia.issue_id, ia.upload_id, u.file_name, u.original_name, u.mime_type, u.file_ext,
             u.file_size, u.storage_path, u.storage_provider, u.uploader_id, u.uploader_name, ia.created_at
      FROM issue_attachments ia
      INNER JOIN uploads u ON u.id = ia.upload_id
      WHERE ia.issue_id = ?
      ORDER BY ia.created_at ASC, ia.id ASC
    `).all(issueId) as IssueAttachmentRow[];
    return rows.map((row) => this.toEntity(row));
  }

  findById(issueId: string, attachmentId: string): IssueAttachmentEntity | null {
    const row = this.db.prepare(`
      SELECT ia.id, ia.issue_id, ia.upload_id, u.file_name, u.original_name, u.mime_type, u.file_ext,
             u.file_size, u.storage_path, u.storage_provider, u.uploader_id, u.uploader_name, ia.created_at
      FROM issue_attachments ia
      INNER JOIN uploads u ON u.id = ia.upload_id
      WHERE ia.issue_id = ? AND ia.id = ?
      LIMIT 1
    `).get(issueId, attachmentId) as IssueAttachmentRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  create(entity: { id: string; issueId: string; uploadId: string; createdAt: string }): void {
    this.db.prepare(`
      INSERT INTO issue_attachments (id, issue_id, upload_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(entity.id, entity.issueId, entity.uploadId, entity.createdAt);
  }

  delete(issueId: string, attachmentId: string): boolean {
    const result = this.db.prepare(`DELETE FROM issue_attachments WHERE issue_id = ? AND id = ?`).run(issueId, attachmentId);
    return result.changes > 0;
  }

  private toEntity(row: IssueAttachmentRow): IssueAttachmentEntity {
    return {
      id: row.id,
      issueId: row.issue_id,
      uploadId: row.upload_id,
      fileName: row.file_name,
      originalName: row.original_name,
      mimeType: row.mime_type,
      fileExt: row.file_ext,
      fileSize: row.file_size,
      storagePath: row.storage_path,
      storageProvider: row.storage_provider as "local",
      uploaderId: row.uploader_id,
      uploaderName: row.uploader_name,
      createdAt: row.created_at
    };
  }
}
