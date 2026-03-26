import type { FastifyInstance } from "fastify";
import { requirePersonalTokenAuth } from "../../shared/auth/require-personal-token-auth";
import { AppError } from "../../shared/errors/app-error";
import { ok } from "../../shared/http/response";
import { assignIssueSchema, closeIssueSchema, reopenIssueSchema, resolveIssueSchema } from "../issue/issue.schema";
import { createIssueCommentSchema } from "../issue/comment/issue-comment.schema";
import { addIssueParticipantSchema } from "../issue/participant/issue-participant.schema";
import { personalIssueIdParamSchema, personalIssueParticipantParamSchema } from "./personal-token.schema";

export default async function personalTokenIssueRoutes(app: FastifyInstance) {
  app.post("/projects/:projectKey/issues/:issueId/comments", async (request, reply) => {
    const ctx = requirePersonalTokenAuth(request, "issue:comment:write");
    const params = personalIssueIdParamSchema.parse(request.params);
    await assertIssueProjectAccess(app, params.projectKey, params.issueId, ctx);
    const body = createIssueCommentSchema.parse(request.body);
    const entity = await app.container.issueCommentCommand.create(params.issueId, body, ctx);
    return reply.status(201).send(ok(entity, "issue comment created"));
  });

  app.post("/projects/:projectKey/issues/:issueId/assign", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "issue:assign:write");
    const params = personalIssueIdParamSchema.parse(request.params);
    await assertIssueProjectAccess(app, params.projectKey, params.issueId, ctx);
    const body = assignIssueSchema.parse(request.body);
    return ok(await app.container.issueCommand.assign(params.issueId, body, ctx), "issue assigned");
  });

  app.post("/projects/:projectKey/issues/:issueId/claim", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "issue:assign:write");
    const params = personalIssueIdParamSchema.parse(request.params);
    await assertIssueProjectAccess(app, params.projectKey, params.issueId, ctx);
    return ok(await app.container.issueCommand.claim(params.issueId, ctx), "issue claimed");
  });

  app.post("/projects/:projectKey/issues/:issueId/start", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "issue:transition:write");
    const params = personalIssueIdParamSchema.parse(request.params);
    await assertIssueProjectAccess(app, params.projectKey, params.issueId, ctx);
    return ok(await app.container.issueCommand.start(params.issueId, ctx), "issue started");
  });

  app.post("/projects/:projectKey/issues/:issueId/resolve", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "issue:transition:write");
    const params = personalIssueIdParamSchema.parse(request.params);
    await assertIssueProjectAccess(app, params.projectKey, params.issueId, ctx);
    const body = resolveIssueSchema.parse(request.body);
    return ok(await app.container.issueCommand.resolve(params.issueId, body, ctx), "issue resolved");
  });

  app.post("/projects/:projectKey/issues/:issueId/verify", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "issue:transition:write");
    const params = personalIssueIdParamSchema.parse(request.params);
    await assertIssueProjectAccess(app, params.projectKey, params.issueId, ctx);
    return ok(await app.container.issueCommand.verify(params.issueId, ctx), "issue verified");
  });

  app.post("/projects/:projectKey/issues/:issueId/reopen", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "issue:transition:write");
    const params = personalIssueIdParamSchema.parse(request.params);
    await assertIssueProjectAccess(app, params.projectKey, params.issueId, ctx);
    const body = reopenIssueSchema.parse(request.body);
    return ok(await app.container.issueCommand.reopen(params.issueId, body, ctx), "issue reopened");
  });

  app.post("/projects/:projectKey/issues/:issueId/close", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "issue:transition:write");
    const params = personalIssueIdParamSchema.parse(request.params);
    await assertIssueProjectAccess(app, params.projectKey, params.issueId, ctx);
    const body = closeIssueSchema.parse(request.body);
    return ok(await app.container.issueCommand.close(params.issueId, body, ctx), "issue closed");
  });

  app.post("/projects/:projectKey/issues/:issueId/participants", async (request, reply) => {
    const ctx = requirePersonalTokenAuth(request, "issue:participant:write");
    const params = personalIssueIdParamSchema.parse(request.params);
    await assertIssueProjectAccess(app, params.projectKey, params.issueId, ctx);
    const body = addIssueParticipantSchema.parse(request.body);
    const entity = await app.container.issueParticipantCommand.add(params.issueId, body, ctx);
    return reply.status(201).send(ok(entity, "issue participant added"));
  });

  app.delete("/projects/:projectKey/issues/:issueId/participants/:participantId", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "issue:participant:write");
    const params = personalIssueParticipantParamSchema.parse(request.params);
    await assertIssueProjectAccess(app, params.projectKey, params.issueId, ctx);
    return ok(
      await app.container.issueParticipantCommand.remove(params.issueId, params.participantId, ctx),
      "issue participant removed"
    );
  });
}

async function assertIssueProjectAccess(app: FastifyInstance, projectKey: string, issueId: string, ctx: ReturnType<typeof requirePersonalTokenAuth>) {
  const projectId = app.container.personalTokenQuery.resolveProjectId(projectKey);
  const issue = await app.container.issueQuery.getById(issueId, ctx);
  if (issue.projectId !== projectId) {
    throw new AppError("ISSUE_NOT_FOUND", "issue not found", 404);
  }
}
