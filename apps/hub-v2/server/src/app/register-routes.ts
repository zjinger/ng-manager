import fs from "node:fs";
import path from "node:path";
import { createReadStream } from "node:fs";
import type { FastifyInstance } from "fastify";
import announcementPublicRoutes from "../modules/announcement/announcement-public.routes";
import announcementRoutes from "../modules/announcement/announcement.routes";
import apiTokenAdminRoutes from "../modules/api-token/api-token-admin.routes";
import apiTokenRoutes from "../modules/api-token/api-token.routes";
import authRoutes from "../modules/auth/auth.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import feedbackPublicRoutes from "../modules/feedback/feedback-public.routes";
import feedbackRoutes from "../modules/feedback/feedback.routes";
import documentPublicRoutes from "../modules/document/document-public.routes";
import documentRoutes from "../modules/document/document.routes";
import notificationRoutes from "../modules/notifications/notification.routes";
import profileRoutes from "../modules/profile/profile.routes";
import issueAttachmentRoutes from "../modules/issue/attachment/issue-attachment.routes";
import issueCommentRoutes from "../modules/issue/comment/issue-comment.routes";
import issueParticipantRoutes from "../modules/issue/participant/issue-participant.routes";
import issueRoutes from "../modules/issue/issue.routes";
import projectRoutes from "../modules/project/project.routes";
import rdRoutes from "../modules/rd/rd.routes";
import releasePublicRoutes from "../modules/release/release-public.routes";
import releaseRoutes from "../modules/release/release.routes";
import sharedConfigPublicRoutes from "../modules/shared-config/shared-config-public.routes";
import sharedConfigRoutes from "../modules/shared-config/shared-config.routes";
import healthRoutes from "../modules/system/health.routes";
import uploadRoutes from "../modules/upload/upload.routes";
import userRoutes from "../modules/user/user.routes";

function resolveSpaRoot(cwd = process.cwd()) {
  const candidates = [
    path.join(cwd, "www", "browser"),
    path.join(cwd, "web", "dist", "hub-v2-web", "browser"),
    path.join(cwd, "dist", "www", "browser")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}

function guessContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".ico":
      return "image/x-icon";
    case ".webp":
      return "image/webp";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: "/api/admin" });
  await app.register(apiTokenAdminRoutes, { prefix: "/api/admin" });
  await app.register(announcementRoutes, { prefix: "/api/admin" });
  await app.register(dashboardRoutes, { prefix: "/api/admin" });
  await app.register(feedbackRoutes, { prefix: "/api/admin" });
  await app.register(documentRoutes, { prefix: "/api/admin" });
  await app.register(notificationRoutes, { prefix: "/api/admin" });
  await app.register(profileRoutes, { prefix: "/api/admin" });
  await app.register(issueRoutes, { prefix: "/api/admin" });
  await app.register(issueAttachmentRoutes, { prefix: "/api/admin" });
  await app.register(issueCommentRoutes, { prefix: "/api/admin" });
  await app.register(issueParticipantRoutes, { prefix: "/api/admin" });
  await app.register(rdRoutes, { prefix: "/api/admin" });
  await app.register(releaseRoutes, { prefix: "/api/admin" });
  await app.register(sharedConfigRoutes, { prefix: "/api/admin" });
  await app.register(userRoutes, { prefix: "/api/admin" });
  await app.register(projectRoutes, { prefix: "/api/admin" });
  await app.register(uploadRoutes, { prefix: "/api/admin" });
  await app.register(announcementPublicRoutes, { prefix: "/api/public" });
  await app.register(feedbackPublicRoutes, { prefix: "/api/public" });
  await app.register(documentPublicRoutes, { prefix: "/api/public" });
  await app.register(releasePublicRoutes, { prefix: "/api/public" });
  await app.register(sharedConfigPublicRoutes, { prefix: "/api/public" });
  await app.register(healthRoutes, { prefix: "/api/public" });
  await app.register(apiTokenRoutes, { prefix: "/api/token" });

  const spaRoot = resolveSpaRoot();
  if (!spaRoot) {
    app.log.warn("[hub-v2] SPA static root not found, '/' will not be served");
    return;
  }

  const spaIndexPath = path.join(spaRoot, "index.html");
  app.log.info({ spaRoot }, "[hub-v2] SPA static root enabled");

  app.get("/", async (_request, reply) => {
    reply.type("text/html; charset=utf-8");
    return reply.send(createReadStream(spaIndexPath));
  });

  app.get("/*", async (request, reply) => {
    const wildcardPath = String((request.params as { "*": string })["*"] ?? "").trim();
    const normalized = wildcardPath.replace(/^\/+/, "");

    if (
      normalized.startsWith("api/") ||
      normalized.startsWith("ws")
    ) {
      return reply.code(404).send({
        message: `Route GET:/${normalized} not found`,
        error: "Not Found",
        statusCode: 404
      });
    }

    const resolvedPath = path.resolve(spaRoot, normalized);
    if (!resolvedPath.startsWith(spaRoot)) {
      return reply.code(403).send({
        message: "Forbidden",
        error: "Forbidden",
        statusCode: 403
      });
    }

    if (normalized && fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      reply.type(guessContentType(resolvedPath));
      return reply.send(createReadStream(resolvedPath));
    }

    reply.type("text/html; charset=utf-8");
    return reply.send(createReadStream(spaIndexPath));
  });
}
