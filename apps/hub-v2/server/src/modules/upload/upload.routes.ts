import type { FastifyInstance } from "fastify";
import { createReadStream, existsSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { saveMultipartFile } from "../../shared/storage/file-storage";
import { assertUploadAllowed, resolveUploadPolicy } from "./upload-policy";

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
    if (
      category === "issue" ||
      category === "issues" ||
      category === "attachment" ||
      category === "comment" ||
      category.startsWith("markdown")
    ) {
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
    const uploadPolicy = resolveUploadPolicy(normalizedBucket, normalizedCategory);
    const targetDir =
      normalizedBucket === "issues" && entityType === "issue" && entityId
        ? path.join(app.config.uploadDir, normalizedBucket, entityId)
        : path.join(app.config.uploadDir, normalizedBucket);
    let saved: Awaited<ReturnType<typeof saveMultipartFile>> | null = null;

    assertUploadAllowed(
      {
        fileName: file.filename,
        mimeType: file.mimetype,
        fileSize: 0
      },
      uploadPolicy,
      app.config.uploadMaxFileSize
    );

    try {
      saved = await saveMultipartFile(file, targetDir);
      assertUploadAllowed(
        {
          fileName: saved.originalName,
          mimeType: saved.mimeType,
          fileSize: saved.fileSize
        },
        uploadPolicy,
        app.config.uploadMaxFileSize
      );

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
    } catch (error) {
      if (saved?.storagePath) {
        cleanupSavedFile(saved.storagePath);
      }
      throw error;
    }
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

    const fileStat = statSync(filePath);
    const rangeHeader = typeof request.headers.range === "string" ? request.headers.range : request.headers.range?.[0];
    const requestedRange = parseByteRange(rangeHeader, fileStat.size);

    reply.header("Content-Type", upload.mimeType || "application/octet-stream");
    reply.header("Accept-Ranges", "bytes");
    reply.header("Content-Disposition", buildInlineDisposition(upload.originalName || upload.fileName));
    if (requestedRange) {
      const { start, end } = requestedRange;
      reply.code(206);
      reply.header("Content-Length", String(end - start + 1));
      reply.header("Content-Range", `bytes ${start}-${end}/${fileStat.size}`);
      return reply.send(createReadStream(filePath, { start, end }));
    }

    reply.header("Content-Length", String(fileStat.size));
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

function cleanupSavedFile(filePath: string): void {
  try {
    rmSync(filePath, { force: true });
  } catch {}
}

function buildInlineDisposition(fileName: string): string {
  const normalizedName = (fileName || "file").trim() || "file";
  const asciiFallback = normalizedName.replace(/[^\x20-\x7E]+/g, "_").replace(/["\\]/g, "");
  const encodedName = encodeURIComponent(normalizedName);
  return `inline; filename="${asciiFallback || "file"}"; filename*=UTF-8''${encodedName}`;
}

function parseByteRange(rangeHeader: string | undefined, fileSize: number): { start: number; end: number } | null {
  if (!rangeHeader || fileSize <= 0) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) {
    return null;
  }

  const [, startRaw, endRaw] = match;
  if (!startRaw && !endRaw) {
    return null;
  }

  if (!startRaw) {
    const suffixLength = Number.parseInt(endRaw, 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }
    const start = Math.max(fileSize - suffixLength, 0);
    return { start, end: fileSize - 1 };
  }

  const start = Number.parseInt(startRaw, 10);
  if (!Number.isFinite(start) || start < 0 || start >= fileSize) {
    return null;
  }

  if (!endRaw) {
    return { start, end: fileSize - 1 };
  }

  const end = Number.parseInt(endRaw, 10);
  if (!Number.isFinite(end) || end < start) {
    return null;
  }

  return { start, end: Math.min(end, fileSize - 1) };
}
