import type { MultipartFile } from "@fastify/multipart";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { createReadStream, existsSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { saveMultipartFile } from "../../shared/storage/file-storage";
import { assertUploadAllowed, resolveUploadPolicy } from "../upload/upload-policy";
import { createSkillCommentSchema, exportSkillQuerySchema, favoriteSkillSchema, listSkillsQuerySchema, rejectSkillVersionSchema, reviewSkillSchema } from "./skill-hub.schema";

const SKILL_PACKAGE_UPLOAD_POLICY = resolveUploadPolicy("skills", "package");

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

function parseTags(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function skillHubRoutes(app: FastifyInstance) {
  app.get("/skills", async (request) => {
    const ctx = requireAuth(request);
    const query = listSkillsQuerySchema.parse(request.query);
    return ok(await app.container.skillHubQuery.list(query, ctx));
  });

  app.get("/skills/meta", async (request) => {
    const ctx = requireAuth(request);
    const query = listSkillsQuerySchema.parse(request.query);
    return ok(await app.container.skillHubQuery.getMeta(query, ctx));
  });

  app.get("/skills/:skillId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string };
    return ok(await app.container.skillHubQuery.getById(params.skillId, ctx));
  });

  app.post("/skills", async (request, reply) => {
    const ctx = requireAuth(request);
    const file = await requireSkillPackageFile(request);
    const saved = await saveSkillPackage(app, file, null);
    let uploadId: string | null = null;
    try {
      const upload = await app.container.uploadCommand.create(
        {
          bucket: "skills",
          category: "package",
          visibility: "private",
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
      uploadId = upload.id;
      const entity = await app.container.skillHubCommand.create(
        {
          packageUploadId: upload.id,
          packagePath: upload.storagePath,
          packageSize: upload.fileSize,
          checksum: upload.checksum,
          name: getFieldValue(file.fields.name),
          slug: getFieldValue(file.fields.slug),
          version: getFieldValue(file.fields.version),
          category: getFieldValue(file.fields.category),
          tags: parseTags(getFieldValue(file.fields.tags)),
          descriptionMd: getFieldValue(file.fields.descriptionMd)
        },
        ctx
      );
      return reply.status(201).send(ok(entity, "skill created"));
    } catch (error) {
      if (uploadId) {
        await app.container.uploadCommand.deactivateUpload(uploadId, ctx);
      }
      cleanupSavedFile(saved.storagePath);
      throw error;
    }
  });

  app.post("/skills/:skillId/versions", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string };
    const file = await requireSkillPackageFile(request);
    const saved = await saveSkillPackage(app, file, params.skillId);
    let uploadId: string | null = null;
    try {
      const upload = await app.container.uploadCommand.create(
        {
          bucket: "skills",
          category: "package",
          visibility: "private",
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
      uploadId = upload.id;
      const entity = await app.container.skillHubCommand.createVersion(
        params.skillId,
        {
          packageUploadId: upload.id,
          packagePath: upload.storagePath,
          packageSize: upload.fileSize,
          checksum: upload.checksum,
          name: getFieldValue(file.fields.name),
          version: getFieldValue(file.fields.version),
          category: getFieldValue(file.fields.category),
          tags: parseTags(getFieldValue(file.fields.tags)),
          descriptionMd: getFieldValue(file.fields.descriptionMd)
        },
        ctx
      );
      return reply.status(201).send(ok(entity, "skill version created"));
    } catch (error) {
      if (uploadId) {
        await app.container.uploadCommand.deactivateUpload(uploadId, ctx);
      }
      cleanupSavedFile(saved.storagePath);
      throw error;
    }
  });

  app.post("/skills/:skillId/versions/:versionId/submit", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string; versionId: string };
    return ok(await app.container.skillHubCommand.submitVersion(params.skillId, params.versionId, ctx), "skill version submitted");
  });

  app.post("/skills/:skillId/versions/:versionId/publish", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string; versionId: string };
    return ok(await app.container.skillHubCommand.publishVersion(params.skillId, params.versionId, ctx), "skill version published");
  });

  app.post("/skills/:skillId/versions/:versionId/reject", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string; versionId: string };
    const body = rejectSkillVersionSchema.parse(request.body);
    return ok(await app.container.skillHubCommand.rejectVersion(params.skillId, params.versionId, body, ctx), "skill version rejected");
  });

  app.post("/skills/:skillId/archive", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string };
    return ok(await app.container.skillHubCommand.archive(params.skillId, ctx), "skill archived");
  });

  app.delete("/skills/:skillId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string };
    return ok(await app.container.skillHubCommand.deleteSkill(params.skillId, ctx), "skill deleted");
  });

  app.post("/skills/:skillId/favorite", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string };
    const body = favoriteSkillSchema.parse(request.body);
    return ok(await app.container.skillHubCommand.setFavorite(params.skillId, body.favorite, ctx), body.favorite ? "skill favorited" : "skill unfavorited");
  });

  app.post("/skills/:skillId/review", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string };
    const body = reviewSkillSchema.parse(request.body);
    return ok(await app.container.skillHubCommand.review(params.skillId, body, ctx), "skill reviewed");
  });

  app.get("/skills/:skillId/comments", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string };
    return ok({ items: await app.container.skillHubQuery.listComments(params.skillId, ctx) });
  });

  app.post("/skills/:skillId/comments", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string };
    const body = createSkillCommentSchema.parse(request.body);
    const entity = await app.container.skillHubCommand.createComment(params.skillId, body, ctx);
    return reply.status(201).send(ok(entity, "skill comment created"));
  });

  app.get("/skills/:skillId/versions/:versionId/download", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string; versionId: string };
    const version = await app.container.skillHubQuery.getDownload(params.skillId, params.versionId, ctx);
    const upload = await app.container.uploadQuery.getById(version.packageUploadId, ctx);
    const filePath = resolveUploadFilePath(upload.storagePath, upload.fileName, app.config.uploadDir);
    if (upload.status !== "active" || !filePath) {
      throw new AppError(ERROR_CODES.UPLOAD_NOT_FOUND, "skill package file not found", 404);
    }
    const stat = statSync(filePath);
    reply.header("Content-Type", upload.mimeType || "application/zip");
    reply.header("Content-Length", String(stat.size));
    reply.header("Content-Disposition", buildAttachmentDisposition(upload.originalName || upload.fileName));
    return reply.send(createReadStream(filePath));
  });

  app.get("/skills/:skillId/versions/:versionId/export", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { skillId: string; versionId: string };
    const query = exportSkillQuerySchema.parse(request.query);
    return ok(await app.container.skillHubQuery.getExport(params.skillId, params.versionId, query.target, ctx));
  });
}

async function requireSkillPackageFile(request: FastifyRequest): Promise<MultipartFile> {
  const file = await request.file();
  if (!file) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, "skill package file is required", 400);
  }
  return file;
}

async function saveSkillPackage(app: FastifyInstance, file: MultipartFile, skillId: string | null) {
  assertUploadAllowed(
    { fileName: file.filename, mimeType: file.mimetype, fileSize: 0 },
    SKILL_PACKAGE_UPLOAD_POLICY,
    app.config.uploadMaxFileSize
  );

  const targetDir = skillId
    ? path.join(app.config.uploadDir, "skills", sanitizePathSegment(skillId, "unknown"))
    : path.join(app.config.uploadDir, "skills");
  const saved = await saveMultipartFile(file, targetDir);
  assertUploadAllowed(
    { fileName: saved.originalName, mimeType: saved.mimeType, fileSize: saved.fileSize },
    SKILL_PACKAGE_UPLOAD_POLICY,
    app.config.uploadMaxFileSize
  );
  return saved;
}

function sanitizePathSegment(value: string | undefined, fallback: string): string {
  const normalized = (value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return normalized || fallback;
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
  return existsSync(byBasename) ? byBasename : null;
}

function cleanupSavedFile(filePath: string): void {
  try {
    rmSync(filePath, { force: true });
  } catch {}
}

function buildAttachmentDisposition(fileName: string): string {
  const normalizedName = (fileName || "skill.zip").trim() || "skill.zip";
  const asciiFallback = normalizedName.replace(/[^\x20-\x7E]+/g, "_").replace(/["\\]/g, "");
  const encodedName = encodeURIComponent(normalizedName);
  return `attachment; filename="${asciiFallback || "skill.zip"}"; filename*=UTF-8''${encodedName}`;
}
