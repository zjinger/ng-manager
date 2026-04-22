import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import { UploadRepo } from "./upload.repo";
import type { PromoteMarkdownUploadsInput, UploadCommandContract, UploadQueryContract } from "./upload.contract";
import type { CreateUploadInput, UploadEntity } from "./upload.types";
import fs from "node:fs";
import path from "node:path";

export class UploadService implements UploadCommandContract, UploadQueryContract {
  constructor(
    private readonly repo: UploadRepo,
    private readonly uploadDir: string
  ) {}

  async create(input: CreateUploadInput, ctx: RequestContext): Promise<UploadEntity> {
    const now = nowIso();
    const entity: UploadEntity = {
      id: genId("upl"),
      bucket: input.bucket?.trim() || "default",
      category: input.category?.trim() || "general",
      fileName: input.fileName,
      originalName: input.originalName,
      fileExt: input.fileExt || null,
      mimeType: input.mimeType || null,
      fileSize: input.fileSize,
      checksum: input.checksum || null,
      storageProvider: "local",
      storagePath: input.storagePath,
      visibility: input.visibility ?? "private",
      status: "active",
      uploaderId: input.uploaderId ?? ctx.userId ?? null,
      uploaderName: input.uploaderName ?? (ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId),
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
    return entity;
  }

  async getById(id: string, _ctx: RequestContext): Promise<UploadEntity> {
    const upload = this.repo.findById(id);
    if (!upload) {
      throw new AppError(ERROR_CODES.UPLOAD_NOT_FOUND, `upload not found: ${id}`, 404);
    }
    return upload;
  }

  async promoteMarkdownUploads(input: PromoteMarkdownUploadsInput, _ctx: RequestContext): Promise<void> {
    const normalizedBucket = input.bucket.trim();
    const normalizedEntityId = input.entityId.trim();
    if (!normalizedBucket || !normalizedEntityId) {
      return;
    }

    const uploadIds = this.extractUploadIdsFromMarkdown(input.content);
    const uniqueIds = Array.from(new Set(uploadIds.map((item) => item.trim()).filter(Boolean)));
    if (uniqueIds.length === 0) {
      return;
    }

    for (const uploadId of uniqueIds) {
      const upload = this.repo.findById(uploadId);
      if (!upload) {
        continue;
      }
      if (upload.bucket !== "temp") {
        continue;
      }
      if (!(upload.category.startsWith("markdown") || upload.category === "comment")) {
        continue;
      }

      const sourcePath = this.resolveUploadFilePath(upload.storagePath, upload.fileName);
      if (!sourcePath) {
        continue;
      }

      const targetDir = path.resolve(this.uploadDir, normalizedBucket, normalizedEntityId);
      const targetPath = path.join(targetDir, upload.fileName);
      fs.mkdirSync(targetDir, { recursive: true });

      if (path.resolve(sourcePath) !== path.resolve(targetPath)) {
        if (!fs.existsSync(targetPath)) {
          this.moveFile(sourcePath, targetPath);
        }
      }

      this.repo.updateStorageAndBucket(upload.id, normalizedBucket, upload.category, targetPath, nowIso());
    }
  }

  private resolveUploadFilePath(storagePath: string, fileName: string): string | null {
    if (storagePath && fs.existsSync(storagePath)) {
      return storagePath;
    }

    const byFileName = path.resolve(this.uploadDir, fileName);
    if (fs.existsSync(byFileName)) {
      return byFileName;
    }

    const byBasename = path.resolve(this.uploadDir, path.basename(storagePath || fileName));
    if (fs.existsSync(byBasename)) {
      return byBasename;
    }

    return null;
  }

  private moveFile(sourcePath: string, targetPath: string): void {
    try {
      fs.renameSync(sourcePath, targetPath);
      return;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "EXDEV") {
        throw error;
      }
    }

    fs.copyFileSync(sourcePath, targetPath);
    fs.unlinkSync(sourcePath);
  }

  private extractUploadIdsFromMarkdown(content: string | null | undefined): string[] {
    if (!content) {
      return [];
    }

    const ids = new Set<string>();
    const pattern = /\/api\/admin\/uploads\/([a-zA-Z0-9_-]+)\/raw/g;
    let match = pattern.exec(content);
    while (match) {
      const id = match[1]?.trim();
      if (id) {
        ids.add(id);
      }
      match = pattern.exec(content);
    }
    return Array.from(ids);
  }
}
