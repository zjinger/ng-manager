import type { FastifyInstance } from "fastify";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { requirePersonalTokenAuth } from "../../shared/auth/require-personal-token-auth";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { ok } from "../../shared/http/response";
import { listSkillsQuerySchema } from "../skill-hub/skill-hub.schema";

export default async function personalTokenSkillRoutes(app: FastifyInstance) {
  app.get("/skills", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "skill:read");
    const query = listSkillsQuerySchema.parse(request.query);
    return ok(
      await app.container.skillHubQuery.list(
        {
          ...query,
          status: "published"
        },
        ctx
      )
    );
  });

  app.get("/skills/:skillId", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "skill:read");
    const params = request.params as { skillId: string };
    return ok(await app.container.skillHubQuery.getById(params.skillId, ctx));
  });

  app.get("/skills/:skillId/versions/:versionId/download", async (request, reply) => {
    const ctx = requirePersonalTokenAuth(request, "skill:read");
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

function buildAttachmentDisposition(fileName: string): string {
  const normalizedName = (fileName || "skill.zip").trim() || "skill.zip";
  const asciiFallback = normalizedName.replace(/[^\x20-\x7E]+/g, "_").replace(/["\\]/g, "");
  const encodedName = encodeURIComponent(normalizedName);
  return `attachment; filename="${asciiFallback || "skill.zip"}"; filename*=UTF-8''${encodedName}`;
}
