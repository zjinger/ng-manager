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
    storage_provider: string;
    storage_path: string;
    visibility: string;
    status: string;
    uploader_id: string | null;
    uploader_name: string | null;
    created_at: string;
    updated_at: string;
};

export class UploadRepo {
    constructor(private readonly db: Database.Database) { }

    create(entity: UploadEntity): void {
        this.db.prepare(`
      INSERT INTO uploads (
        id, bucket, category, file_name, original_name, file_ext, mime_type, file_size, checksum,
        storage_provider, storage_path, visibility, status, uploader_id, uploader_name, created_at, updated_at
      ) VALUES (
        @id, @bucket, @category, @file_name, @original_name, @file_ext, @mime_type, @file_size, @checksum,
        @storage_provider, @storage_path, @visibility, @status, @uploader_id, @uploader_name, @created_at, @updated_at
      )
    `).run(this.toDbEntity(entity));
    }

    findById(id: string): UploadEntity | null {
        const row = this.db.prepare(`SELECT * FROM uploads WHERE id = ?`).get(id) as UploadRow | undefined;
        return row ? this.toEntity(row) : null;
    }

    updateStatus(id: string, status: UploadEntity["status"], updatedAt: string): boolean {
        const result = this.db.prepare(`UPDATE uploads SET status = ?, updated_at = ? WHERE id = ?`).run(status, updatedAt, id);
        return result.changes > 0;
    }

    private toDbEntity(entity: UploadEntity) {
        return {
            id: entity.id,
            bucket: entity.bucket,
            category: entity.category,
            file_name: entity.fileName,
            original_name: entity.originalName,
            file_ext: entity.fileExt ?? null,
            mime_type: entity.mimeType ?? null,
            file_size: entity.fileSize,
            checksum: entity.checksum ?? null,
            storage_provider: entity.storageProvider,
            storage_path: entity.storagePath,
            visibility: entity.visibility,
            status: entity.status,
            uploader_id: entity.uploaderId ?? null,
            uploader_name: entity.uploaderName ?? null,
            created_at: entity.createdAt,
            updated_at: entity.updatedAt
        };
    }

    private toEntity(row: UploadRow): UploadEntity {
        return {
            id: row.id,
            bucket: row.bucket,
            category: row.category as UploadEntity["category"],
            fileName: row.file_name,
            originalName: row.original_name,
            fileExt: row.file_ext,
            mimeType: row.mime_type,
            fileSize: row.file_size,
            checksum: row.checksum,
            storageProvider: row.storage_provider as "local",
            storagePath: row.storage_path,
            visibility: row.visibility as UploadEntity["visibility"],
            status: row.status as UploadEntity["status"],
            uploaderId: row.uploader_id,
            uploaderName: row.uploader_name,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
