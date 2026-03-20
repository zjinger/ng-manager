import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import { UploadRepo } from "./upload.repo";
import type { UploadCommandContract, UploadQueryContract } from "./upload.contract";
import type { CreateUploadInput, UploadEntity } from "./upload.types";

export class UploadService implements UploadCommandContract, UploadQueryContract {
  constructor(private readonly repo: UploadRepo) {}

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
      uploaderName: input.uploaderName ?? null,
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
    return entity;
  }

  async getById(id: string, _ctx: RequestContext): Promise<UploadEntity> {
    const upload = this.repo.findById(id);
    if (!upload) {
      throw new AppError("UPLOAD_NOT_FOUND", `upload not found: ${id}`, 404);
    }
    return upload;
  }
}
