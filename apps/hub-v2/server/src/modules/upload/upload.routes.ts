import type { FastifyInstance } from "fastify";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { saveMultipartFile } from "../../shared/storage/file-storage";

function getFieldValue(field: unknown): string | undefined {
  if (!field) {
    return undefined;
  }

  if (Array.isArray(field)) {
    return getFieldValue(field[0]);
  }

  if (typeof field === "object" && field !== null && "value" in field) {
    const value = (field as { value?: unknown }).value;
    return typeof value === "string" ? value : undefined;
  }

  return undefined;
}

function sanitizePathSegment(value: string | undefined, fallback: string): string {
  const normalized = (value || "").trim().toLowerCase();
  const safe = normalized.replace(/[^a-z0-9_-]/g, "");
  return safe || fallback;
}

function normalizeBucket(bucketRaw: string | undefined, categoryRaw: string | undefined): string {
  const bucket = sanitizePathSegment(bucketRaw, "");
  const category = sanitizePathSegment(categoryRaw, "general");

  if (bucket === "avatars" || bucket === "issues" || bucket === "project-avatars") {
    return bucket;
  }

  if (bucket === "default" || bucket === "global" || bucket === "general" || bucket === "misc" || bucket === "") {
    if (category === "avatar" || category === "avatars" || category === "profile") {
      return "avatars";
    }
    if (category === "issue" || category === "issues" || category === "attachment" || category === "markdown") {
      return "issues";
    }
    if (category === "project_avatar" || category === "project-avatar" || category === "project") {
      return "project-avatars";
    }
    return "misc";
  }

  return bucket;
}

export default async function uploadRoutes(app: FastifyInstance) {
  app.post("/uploads", async (request, reply) => {
    const ctx = requireAuth(request);
    const file = await request.file();

    if (!file) {
      return reply.status(400).send({
        code: "BAD_REQUEST",
        message: "file is required"
      });
    }

    const bucket = getFieldValue(file.fields.bucket);
    const category = getFieldValue(file.fields.category);
    const entityType = sanitizePathSegment(getFieldValue(file.fields.entityType), "");
    const entityId = sanitizePathSegment(getFieldValue(file.fields.entityId), "");
    const visibility = getFieldValue(file.fields.visibility);
    const normalizedBucket = normalizeBucket(bucket, category);
    const normalizedCategory = sanitizePathSegment(category, "general");
    const targetDir =
      normalizedBucket === "issues" && entityType === "issue" && entityId
        ? path.join(app.config.uploadDir, normalizedBucket, entityId)
        : path.join(app.config.uploadDir, normalizedBucket);
    const saved = await saveMultipartFile(file, targetDir);
    const upload = await app.container.uploadCommand.create(
      {
        bucket: normalizedBucket,
        category: normalizedCategory,
        visibility: visibility === "public" || visibility === "private" ? visibility : undefined,
        fileName: saved.fileName,
        originalName: saved.originalName,
        fileExt: saved.fileExt,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        checksum: saved.checksum,
        storagePath: saved.storagePath
      },
      ctx
    );

    return reply.status(201).send(ok(upload, "upload created"));
  });

  app.get("/uploads/:uploadId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { uploadId: string };
    return ok(await app.container.uploadQuery.getById(params.uploadId, ctx));
  });

  app.get("/uploads/:uploadId/raw", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { uploadId: string };
    const upload = await app.container.uploadQuery.getById(params.uploadId, ctx);
    const filePath = resolveUploadFilePath(upload.storagePath, upload.fileName, app.config.uploadDir);
    if (upload.status !== "active" || !filePath) {
      return reply.status(404).send({
        code: "UPLOAD_NOT_FOUND",
        message: "upload file not found"
      });
    }

    reply.header("Content-Type", upload.mimeType || "application/octet-stream");
    reply.header("Content-Disposition", `inline; filename="${encodeURIComponent(upload.fileName)}"`);
    return reply.send(createReadStream(filePath));
  });
}

function resolveUploadFilePath(storagePath: string, fileName: string, uploadDir: string): string | null {
  if (storagePath && existsSync(storagePath)) {
    return storagePath;
  }

  const byFileName = path.resolve(uploadDir, fileName);
  if (existsSync(byFileName)) {
    return byFileName;
  }

  const byBasename = path.resolve(uploadDir, path.basename(storagePath || fileName));
  if (existsSync(byBasename)) {
    return byBasename;
  }

  return null;
}
