import fs from "node:fs";
import path from "node:path";
import { createReadStream } from "node:fs";
import type { FastifyInstance, FastifyReply } from "fastify";
import announcementPublicRoutes from "../modules/announcement/announcement-public.routes";
import announcementRoutes from "../modules/announcement/announcement.routes";
import approvalTemplateRoutes from "../modules/approval-template/approval-template.routes";
import auditLogRoutes from "../modules/audit-log/audit-log.routes";
import apiTokenAdminRoutes from "../modules/api-token/api-token-admin.routes";
import apiTokenRoutes from "../modules/api-token/api-token.routes";
import authRoutes from "../modules/auth/auth.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import deliveryWeeklyReportRoutes from "../modules/delivery-weekly-report/delivery-weekly-report.routes";
import feedbackPublicRoutes from "../modules/feedback/feedback-public.routes";
import feedbackRoutes from "../modules/feedback/feedback.routes";
import documentPublicRoutes from "../modules/document/document-public.routes";
import documentRoutes from "../modules/document/document.routes";
import mobileRoutes from "../modules/mobile/mobile.routes";
import mobileAppDownloadAdminRoutes from "../modules/mobile-app-download/mobile-app-download-admin.routes";
import mobileAppDownloadPublicRoutes from "../modules/mobile-app-download/mobile-app-download-public.routes";
import notificationRoutes from "../modules/notifications/notification.routes";
import organizationRoutes from "../modules/organization/organization.routes";
import personalTodoRoutes from "../modules/personal-todo/personal-todo.routes";
import personalTokenAdminRoutes from "../modules/personal-token/personal-token-admin.routes";
import personalTokenIntrospectRoutes from "../modules/personal-token/personal-token-introspect.routes";
import personalTokenIssueRoutes from "../modules/personal-token/personal-token-issue.routes";
import personalTokenRdRoutes from "../modules/personal-token/personal-token-rd.routes";
import personalTokenDocumentRoutes from "../modules/personal-token/personal-token-document.routes";
import personalTokenSkillRoutes from "../modules/personal-token/personal-token-skill.routes";
import personalTokenUploadRoutes from "../modules/personal-token/personal-token-upload.routes";
import profileRoutes from "../modules/profile/profile.routes";
import issueAttachmentRoutes from "../modules/issue/attachment/issue-attachment.routes";
import issueBranchRoutes from "../modules/issue/branch/issue-branch.routes";
import issueCommentRoutes from "../modules/issue/comment/issue-comment.routes";
import issueParticipantRoutes from "../modules/issue/participant/issue-participant.routes";
import issueRoutes from "../modules/issue/issue.routes";
import projectRoutes from "../modules/project/project.routes";
import rdTaskSheetRoutes from "../modules/rd/rd-task-sheet.routes";
import rdRoutes from "../modules/rd/rd.routes";
import releasePublicRoutes from "../modules/release/release-public.routes";
import releaseRoutes from "../modules/release/release.routes";
import sharedConfigPublicRoutes from "../modules/shared-config/shared-config-public.routes";
import sharedConfigRoutes from "../modules/shared-config/shared-config.routes";
import skillHubRoutes from "../modules/skill-hub/skill-hub.routes";
import systemRbacRoutes from "../modules/system-rbac/system-rbac.routes";
import projectTitleRoutes from "../modules/project-title/project-title.routes";
import organizationTitleRoutes from "../modules/organization-title/organization-title.routes";
import systemSettingsRoutes from "../modules/system-settings/system-settings.routes";
import healthRoutes from "../modules/system/health.routes";
import uploadRoutes from "../modules/upload/upload.routes";
import userRoutes from "../modules/user/user.routes";
import adminSearchRoutes from "../modules/admin-search/admin-search.routes";
import aiRoutes from "../modules/ai/ai.routes";
import aiReportRoutes from "../modules/ai/ai-report.routes";
import aiReportPublicRoutes from "../modules/ai/ai-report-public.routes";
import searchRoutes from "../modules/search/search.routes";
import surveyPublicRoutes from "../modules/survey/survey-public.routes";
import surveyRoutes from "../modules/survey/survey.routes";
import reportPublicRoutes from "../modules/report-public/report-public.routes";
import reimbursementRoutes from "../modules/reimbursement/reimbursement.routes";
import errorReportRoutes from "../modules/error-report/error-report.routes";

const NO_STORE_CACHE_CONTROL = "no-store, no-cache, must-revalidate, proxy-revalidate";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const SHORT_STATIC_CACHE_CONTROL = "public, max-age=3600";
const IMMUTABLE_ASSET_EXTENSIONS = new Set([
  ".js",
  ".css",
  ".woff",
  ".woff2",
  ".png",
  ".svg",
  ".ico",
  ".webp",
  ".jpg",
  ".jpeg",
  ".gif"
]);

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

function setNoStoreHeaders(reply: FastifyReply) {
  reply.header("Cache-Control", NO_STORE_CACHE_CONTROL);
  reply.header("Pragma", "no-cache");
  reply.header("Expires", "0");
}

function setStaticCacheHeaders(reply: FastifyReply, normalizedPath: string, filePath: string) {
  if (shouldNoStoreStaticFile(normalizedPath)) {
    setNoStoreHeaders(reply);
    return;
  }

  if (isImmutableAsset(filePath)) {
    reply.header("Cache-Control", IMMUTABLE_CACHE_CONTROL);
    return;
  }

  if (isCacheableStaticAsset(filePath)) {
    reply.header("Cache-Control", SHORT_STATIC_CACHE_CONTROL);
  }
}

function shouldNoStoreStaticFile(normalizedPath: string) {
  return normalizedPath === "index.html" || normalizedPath.endsWith(".html") || normalizedPath === "version.json";
}

function isImmutableAsset(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!IMMUTABLE_ASSET_EXTENSIONS.has(ext)) {
    return false;
  }

  return /(?:^|[-.])[a-zA-Z0-9]{8,}(?=\.[^.]+$)/.test(path.basename(filePath));
}

function isCacheableStaticAsset(filePath: string) {
  return IMMUTABLE_ASSET_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function sendSpaIndex(reply: FastifyReply, spaIndexPath: string) {
  setNoStoreHeaders(reply);
  reply.type("text/html; charset=utf-8");
  return reply.send(createReadStream(spaIndexPath));
}

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: "/api/admin" });
  await app.register(apiTokenAdminRoutes, { prefix: "/api/admin" });
  await app.register(announcementRoutes, { prefix: "/api/admin" });
  await app.register(approvalTemplateRoutes, { prefix: "/api/admin" });
  await app.register(auditLogRoutes, { prefix: "/api/admin" });
  await app.register(dashboardRoutes, { prefix: "/api/admin" });
  await app.register(deliveryWeeklyReportRoutes, { prefix: "/api/admin" });
  await app.register(feedbackRoutes, { prefix: "/api/admin" });
  await app.register(documentRoutes, { prefix: "/api/admin" });
  await app.register(mobileRoutes, { prefix: "/api/admin" });
  await app.register(mobileAppDownloadAdminRoutes, { prefix: "/api/admin" });
  await app.register(notificationRoutes, { prefix: "/api/admin" });
  await app.register(organizationRoutes, { prefix: "/api/admin" });
  await app.register(personalTodoRoutes, { prefix: "/api/admin" });
  await app.register(profileRoutes, { prefix: "/api/admin" });
  await app.register(personalTokenAdminRoutes, { prefix: "/api/admin" });
  await app.register(issueRoutes, { prefix: "/api/admin" });
  await app.register(issueAttachmentRoutes, { prefix: "/api/admin" });
  await app.register(issueBranchRoutes, { prefix: "/api/admin" });
  await app.register(issueCommentRoutes, { prefix: "/api/admin" });
  await app.register(issueParticipantRoutes, { prefix: "/api/admin" });
  await app.register(rdRoutes, { prefix: "/api/admin" });
  await app.register(releaseRoutes, { prefix: "/api/admin" });
  await app.register(sharedConfigRoutes, { prefix: "/api/admin" });
  await app.register(skillHubRoutes, { prefix: "/api/admin" });
  await app.register(systemRbacRoutes, { prefix: "/api/admin" });
  await app.register(projectTitleRoutes, { prefix: "/api/admin" });
  await app.register(organizationTitleRoutes, { prefix: "/api/admin" });
  await app.register(systemSettingsRoutes, { prefix: "/api/admin" });
  await app.register(userRoutes, { prefix: "/api/admin" });
  await app.register(adminSearchRoutes, { prefix: "/api/admin" });
  await app.register(projectRoutes, { prefix: "/api/admin" });
  await app.register(rdTaskSheetRoutes, { prefix: "/api/admin" });
  await app.register(uploadRoutes, { prefix: "/api/admin" });
  await app.register(announcementPublicRoutes, { prefix: "/api/public" });
  await app.register(feedbackPublicRoutes, { prefix: "/api/public" });
  await app.register(documentPublicRoutes, { prefix: "/api/public" });
  await app.register(releasePublicRoutes, { prefix: "/api/public" });
  await app.register(sharedConfigPublicRoutes, { prefix: "/api/public" });
  await app.register(mobileAppDownloadPublicRoutes, { prefix: "/api/public" });
  await app.register(healthRoutes, { prefix: "/api/public" });
  await app.register(apiTokenRoutes, { prefix: "/api/token" });
  await app.register(personalTokenIntrospectRoutes, { prefix: "/api/personal" });
  await app.register(personalTokenIssueRoutes, { prefix: "/api/personal" });
  await app.register(personalTokenRdRoutes, { prefix: "/api/personal" });
  await app.register(personalTokenDocumentRoutes, { prefix: "/api/personal" });
  await app.register(personalTokenSkillRoutes, { prefix: "/api/personal" });
  await app.register(personalTokenUploadRoutes, { prefix: "/api/personal" });
  await app.register(aiRoutes, { prefix: "/api/admin" });
  await app.register(aiReportRoutes, { prefix: "/api/admin" });
  await app.register(reportPublicRoutes, { prefix: "/api/admin" });
  await app.register(searchRoutes, { prefix: "/api/admin" });
  await app.register(reimbursementRoutes, { prefix: "/api/admin" });
  await app.register(errorReportRoutes, { prefix: "/api" });
  if (app.config.surveyEnabled) {
    await app.register(surveyRoutes, { prefix: "/api/admin" });
    await app.register(surveyPublicRoutes, { prefix: "/api/public" });
  } else {
    app.log.info("[hub-v2] survey routes are disabled by SURVEY_ENABLED=false");
  }
  await app.register(aiReportPublicRoutes, { prefix: "/api/public" });

  const spaRoot = resolveSpaRoot();
  if (!spaRoot) {
    app.log.warn("[hub-v2] SPA static root not found, '/' will not be served");
    return;
  }

  const spaIndexPath = path.join(spaRoot, "index.html");
  app.log.info({ spaRoot }, "[hub-v2] SPA static root enabled");

  app.get("/", async (_request, reply) => {
    return sendSpaIndex(reply, spaIndexPath);
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
      setStaticCacheHeaders(reply, normalized, resolvedPath);
      reply.type(guessContentType(resolvedPath));
      return reply.send(createReadStream(resolvedPath));
    }

    return sendSpaIndex(reply, spaIndexPath);
  });
}
