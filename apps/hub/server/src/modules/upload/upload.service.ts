import fs from "node:fs";
import path from "node:path";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { buildStoredFileName, ensureDirSync, getFileExt, safeBaseName } from "../../utils/storage";
import { nowIso } from "../../utils/time";
import { UploadRepo } from "./upload.repo";
import type { CreateLocalUploadInput, UploadEntity } from "./upload.types";

export class UploadService {
    constructor(private readonly repo: UploadRepo) { }

    createLocalUpload(input: CreateLocalUploadInput): UploadEntity {
        if (!fs.existsSync(input.tempFilePath)) {
            throw new AppError("UPLOAD_TEMP_FILE_NOT_FOUND", "没有找到临时文件", 400);
        }

        ensureDirSync(input.storageDir);
        const originalName = safeBaseName(input.originalName || "file");
        const storedFileName = buildStoredFileName(originalName);
        const targetPath = path.join(input.storageDir, storedFileName);
        const stat = fs.statSync(input.tempFilePath);
        const now = nowIso();
        const entity: UploadEntity = {
            id: genId("upl"),
            bucket: input.bucket?.trim() || "default",
            category: input.category,
            fileName: storedFileName,
            originalName,
            fileExt: getFileExt(originalName)?.toLowerCase() ?? null,
            mimeType: input.mimeType?.trim().toLowerCase() || null,
            fileSize: input.fileSize || stat.size,
            checksum: input.checksum?.trim() || null,
            storageProvider: "local",
            storagePath: targetPath,
            visibility: input.visibility ?? "private",
            status: input.status ?? "active",
            uploaderId: input.uploaderId?.trim() || null,
            uploaderName: input.uploaderName?.trim() || null,
            createdAt: now,
            updatedAt: now
        };

        fs.copyFileSync(input.tempFilePath, targetPath);
        try {
            this.repo.create(entity);
            return entity;
        } catch (error) {
            if (fs.existsSync(targetPath)) {
                fs.unlinkSync(targetPath);
            }
            throw error;
        }
    }

    getById(id: string): UploadEntity {
        const item = this.repo.findById(id);
        if (!item) {
            throw new AppError("UPLOAD_NOT_FOUND", `上传文件未找到: ${id}`, 404);
        }
        return item;
    }

    softDelete(id: string): UploadEntity {
        const item = this.getById(id);
        const changed = this.repo.updateStatus(id, "deleted", nowIso());
        if (!changed) {
            throw new AppError("UPLOAD_DELETE_FAILED", "无法更新上传文件状态", 500);
        }
        return this.getById(id);
    }

    deleteLocalFile(upload: UploadEntity): void {
        if (upload.storageProvider !== "local") {
            return;
        }
        try {
            if (fs.existsSync(upload.storagePath)) {
                fs.unlinkSync(upload.storagePath);
            }
        } catch {
            throw new AppError("UPLOAD_DELETE_FILE_FAILED", "删除上传文件失败", 500);
        }
    }
}
