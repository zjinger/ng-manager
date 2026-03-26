import type Database from "better-sqlite3";
import type { UploadEntity } from "./upload.types";

type UploadRow = {
  id: string;
  bucket: string;
  category: string;
  file_name: string;
  original_name: string;
  file_ext: string | null;
  mime_type: string | null;
  file_size: number;
  checksum: string | null;
  storage_provider: "local";
  storage_path: string;
  visibility: "private" | "public";
  status: "active" | "inactive";
  uploader_id: string | null;
  uploader_name: string | null;
  created_at: string;
  updated_at: string;
};

export class UploadRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: UploadEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO uploads (
          id, bucket, category, file_name, original_name, file_ext, mime_type, file_size,
          checksum, storage_provider, storage_path, visibility, status, uploader_id, uploader_name,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.bucket,
        entity.category,
        entity.fileName,
        entity.originalName,
        entity.fileExt,
        entity.mimeType,
        entity.fileSize,
        entity.checksum,
        entity.storageProvider,
        entity.storagePath,
        entity.visibility,
        entity.status,
        entity.uploaderId,
        entity.uploaderName,
        entity.createdAt,
        entity.updatedAt
      );
  }

  findById(id: string): UploadEntity | null {
    const row = this.db.prepare("SELECT * FROM uploads WHERE id = ?").get(id) as UploadRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  updateStorageAndBucket(id: string, bucket: string, category: string, storagePath: string, updatedAt: string): boolean {
    const result = this.db
      .prepare(
        `
          UPDATE uploads
          SET bucket = ?, category = ?, storage_path = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(bucket, category, storagePath, updatedAt, id);
    return result.changes > 0;
  }

  private mapRow(row: UploadRow): UploadEntity {
    return {
      id: row.id,
      bucket: row.bucket,
      category: row.category,
      fileName: row.file_name,
      originalName: row.original_name,
      fileExt: row.file_ext,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      checksum: row.checksum,
      storageProvider: row.storage_provider,
      storagePath: row.storage_path,
      visibility: row.visibility,
      status: row.status,
      uploaderId: row.uploader_id,
      uploaderName: row.uploader_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
