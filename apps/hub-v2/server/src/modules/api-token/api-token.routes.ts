import type { FastifyInstance } from "fastify";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { requireTokenAuth } from "../../shared/auth/require-token-auth";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { ok } from "../../shared/http/response";
import {
  feedbackIdParamSchema,
  issueAttachmentRawParamSchema,
  issueIdParamSchema,
  projectParamSchema,
  rdItemIdParamSchema,
  tokenFeedbackListQuerySchema,
  tokenIssueListQuerySchema,
  tokenRdListQuerySchema
} from "./api-token.schema";
import type { TokenIssueListQuery } from "./api-token.types";
import type { TokenRdListQuery, TokenFeedbackListQuery } from "./api-token.types";

export default async function apiTokenRoutes(app: FastifyInstance) {
  app.get("/projects/:projectKey/issues", async (request) => {
    const ctx = requireTokenAuth(request, "issues:read");
    const params = projectParamSchema.parse(request.params);
    const query = tokenIssueListQuerySchema.parse(request.query) as TokenIssueListQuery;
    return ok(await app.container.apiTokenQuery.listIssues(params.projectKey, query, ctx));
  });

  app.get("/projects/:projectKey/issues/:issueId", async (request) => {
    const ctx = requireTokenAuth(request, "issues:read");
    const params = issueIdParamSchema.parse(request.params);
    return ok(await app.container.apiTokenQuery.getIssueById(params.projectKey, params.issueId, ctx));
  });

  app.get("/projects/:projectKey/issues/:issueId/logs", async (request) => {
    const ctx = requireTokenAuth(request, "issues:read");
    const params = issueIdParamSchema.parse(request.params);
    return ok(await app.container.apiTokenQuery.listIssueLogs(params.projectKey, params.issueId, ctx));
  });

  app.get("/projects/:projectKey/issues/:issueId/comments", async (request) => {
    const ctx = requireTokenAuth(request, "issues:read");
    const params = issueIdParamSchema.parse(request.params);
    return ok(await app.container.apiTokenQuery.listIssueComments(params.projectKey, params.issueId, ctx));
  });

  app.get("/projects/:projectKey/issues/:issueId/participants", async (request) => {
    const ctx = requireTokenAuth(request, "issues:read");
    const params = issueIdParamSchema.parse(request.params);
    return ok(await app.container.apiTokenQuery.listIssueParticipants(params.projectKey, params.issueId, ctx));
  });

  app.get("/projects/:projectKey/issues/:issueId/attachments", async (request) => {
    const ctx = requireTokenAuth(request, "issues:read");
    const params = issueIdParamSchema.parse(request.params);
    return ok(await app.container.apiTokenQuery.listIssueAttachments(params.projectKey, params.issueId, ctx));
  });

  app.get("/projects/:projectKey/issues/:issueId/attachments/:attachmentId/raw", async (request, reply) => {
    const ctx = requireTokenAuth(request, "issues:read");
    const params = issueAttachmentRawParamSchema.parse(request.params);
    const attachments = await app.container.apiTokenQuery.listIssueAttachments(params.projectKey, params.issueId, ctx);
    const hit = attachments.items.find((item) => item.id === params.attachmentId.trim());
    if (!hit) {
      throw new AppError(ERROR_CODES.ISSUE_ATTACHMENT_NOT_FOUND, "attachment not found", 404);
    }

    const filePath = resolveUploadFilePath(hit.upload.storagePath, hit.upload.fileName, app.config.uploadDir);
    if (hit.upload.status !== "active" || !filePath) {
      throw new AppError(ERROR_CODES.UPLOAD_NOT_FOUND, "upload file not found", 404);
    }

    reply.header("Content-Type", hit.upload.mimeType || "application/octet-stream");
    reply.header("Content-Disposition", `inline; filename="${encodeURIComponent(hit.upload.fileName)}"`);
    return reply.send(createReadStream(filePath));
  });

  app.get("/projects/:projectKey/members", async (request) => {
    const ctx = requireTokenAuth(request, "issues:read");
    const params = projectParamSchema.parse(request.params);
    return ok(await app.container.apiTokenQuery.listProjectMembers(params.projectKey, ctx));
  });

  app.get("/projects/:projectKey/rd-stages", async (request) => {
    const ctx = requireTokenAuth(request, "rd:read");
    const params = projectParamSchema.parse(request.params);
    return ok(await app.container.apiTokenQuery.listRdStages(params.projectKey, ctx));
  });

  app.get("/projects/:projectKey/rd-items", async (request) => {
    const ctx = requireTokenAuth(request, "rd:read");
    const params = projectParamSchema.parse(request.params);
    const query = tokenRdListQuerySchema.parse(request.query) as TokenRdListQuery;
    return ok(await app.container.apiTokenQuery.listRdItems(params.projectKey, query, ctx));
  });

  app.get("/projects/:projectKey/rd-items/:itemId", async (request) => {
    const ctx = requireTokenAuth(request, "rd:read");
    const params = rdItemIdParamSchema.parse(request.params);
    return ok(await app.container.apiTokenQuery.getRdItemById(params.projectKey, params.itemId, ctx));
  });

  app.get("/projects/:projectKey/rd-items/:itemId/logs", async (request) => {
    const ctx = requireTokenAuth(request, "rd:read");
    const params = rdItemIdParamSchema.parse(request.params);
    return ok(await app.container.apiTokenQuery.listRdLogs(params.projectKey, params.itemId, ctx));
  });

  app.get("/projects/:projectKey/feedbacks", async (request) => {
    const ctx = requireTokenAuth(request, "feedbacks:read");
    const params = projectParamSchema.parse(request.params);
    const query = tokenFeedbackListQuerySchema.parse(request.query) as TokenFeedbackListQuery;
    return ok(await app.container.apiTokenQuery.listFeedbacks(params.projectKey, query, ctx));
  });

  app.get("/projects/:projectKey/feedbacks/:feedbackId", async (request) => {
    const ctx = requireTokenAuth(request, "feedbacks:read");
    const params = feedbackIdParamSchema.parse(request.params);
    return ok(await app.container.apiTokenQuery.getFeedbackById(params.projectKey, params.feedbackId, ctx));
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
