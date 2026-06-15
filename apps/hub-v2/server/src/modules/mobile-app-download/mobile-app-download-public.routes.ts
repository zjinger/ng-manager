import type { FastifyInstance } from "fastify";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { createRequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { ok } from "../../shared/http/response";
import { ProjectRepo } from "../project/project.repo";
import { MobileAppDownloadService } from "./mobile-app-download.service";
import type { MobileAppPlatform, MobileAppProjectRef } from "./mobile-app-download.types";

const projectParamsSchema = z.object({ projectKey: z.string().trim().min(1) });
const packageParamsSchema = z.object({
  projectKey: z.string().trim().min(1),
  platform: z.enum(["android", "ios"])
});

export default async function mobileAppDownloadPublicRoutes(app: FastifyInstance) {
  app.get("/mobile-app/projects/:projectKey/download", async (request, reply) => {
    const ctx = createPublicContext(request.id, request.ip);
    const { projectKey } = projectParamsSchema.parse(request.params);
    const project = resolveProjectByKey(app, projectKey);
    const service = createService(app);
    const data = await service.getPublicDownloadInfo(project, ctx);

    reply.header("Cache-Control", `public, max-age=${data.cache.maxAgeSeconds}`);
    return ok(data);
  });

  app.get("/mobile-app/projects/:projectKey/packages/:platform/download", async (request, reply) => {
    const ctx = createPublicContext(request.id, request.ip);
    const { projectKey, platform } = packageParamsSchema.parse(request.params);
    const project = resolveProjectByKey(app, projectKey);
    const service = createService(app);
    const upload = await service.getPublicPackage(project, platform as MobileAppPlatform, ctx);
    const filePath = resolveUploadFilePath(upload.storagePath, upload.fileName, app.config.uploadDir);
    if (!filePath) {
      throw new AppError(ERROR_CODES.MOBILE_APP_DOWNLOAD_PACKAGE_NOT_FOUND, "mobile app package not found", 404, {
        projectKey,
        platform
      });
    }

    const fileStat = statSync(filePath);
    const rangeHeader = typeof request.headers.range === "string" ? request.headers.range : request.headers.range?.[0];
    const requestedRange = parseByteRange(rangeHeader, fileStat.size);

    reply.header("Content-Type", upload.mimeType || "application/octet-stream");
    reply.header("Accept-Ranges", "bytes");
    reply.header("Content-Disposition", buildAttachmentDisposition(upload.originalName || upload.fileName));
    reply.header("Cache-Control", "private, max-age=0, must-revalidate");
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

function createService(app: FastifyInstance): MobileAppDownloadService {
  return new MobileAppDownloadService({
    sharedConfigQuery: app.container.sharedConfigQuery,
    releaseQuery: app.container.releaseQuery,
    uploadQuery: app.container.uploadQuery
  });
}

function createPublicContext(requestId: string, ip: string) {
  return createRequestContext({
    accountId: "public",
    roles: [],
    source: "http",
    requestId,
    ip
  });
}

function resolveProjectByKey(app: FastifyInstance, projectKey: string): MobileAppProjectRef {
  const repo = new ProjectRepo(app.db);
  const project = repo.findByKey(projectKey);
  if (!project || project.status !== "active") {
    throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectKey}`, 404);
  }
  return {
    id: project.id,
    projectKey: project.projectKey,
    name: project.name
  };
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

function buildAttachmentDisposition(fileName: string): string {
  const normalizedName = (fileName || "mobile-app").trim() || "mobile-app";
  const asciiFallback = normalizedName.replace(/[^\x20-\x7E]+/g, "_").replace(/["\\]/g, "");
  const encodedName = encodeURIComponent(normalizedName);
  return `attachment; filename="${asciiFallback || "mobile-app"}"; filename*=UTF-8''${encodedName}`;
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
