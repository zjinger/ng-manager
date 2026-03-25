import type { FastifyInstance } from "fastify";
import { requireTokenAuth } from "../../shared/auth/require-token-auth";
import { ok } from "../../shared/http/response";
import {
  feedbackIdParamSchema,
  issueIdParamSchema,
  projectParamSchema,
  rdItemIdParamSchema,
  tokenFeedbackListQuerySchema,
  tokenIssueListQuerySchema,
  tokenRdListQuerySchema
} from "./api-token.schema";

export default async function apiTokenRoutes(app: FastifyInstance) {
  app.get("/projects/:projectKey/issues", async (request) => {
    const ctx = requireTokenAuth(request, "issues:read");
    const params = projectParamSchema.parse(request.params);
    const query = tokenIssueListQuerySchema.parse(request.query);
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

  app.get("/projects/:projectKey/rd-items", async (request) => {
    const ctx = requireTokenAuth(request, "rd:read");
    const params = projectParamSchema.parse(request.params);
    const query = tokenRdListQuerySchema.parse(request.query);
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
    const query = tokenFeedbackListQuerySchema.parse(request.query);
    return ok(await app.container.apiTokenQuery.listFeedbacks(params.projectKey, query, ctx));
  });

  app.get("/projects/:projectKey/feedbacks/:feedbackId", async (request) => {
    const ctx = requireTokenAuth(request, "feedbacks:read");
    const params = feedbackIdParamSchema.parse(request.params);
    return ok(await app.container.apiTokenQuery.getFeedbackById(params.projectKey, params.feedbackId, ctx));
  });
}
