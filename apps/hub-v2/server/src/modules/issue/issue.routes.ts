import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  assignIssueSchema,
  closeIssueSchema,
  createIssueSchema,
  listIssuesQuerySchema,
  reopenIssueSchema,
  resolveIssueSchema,
  updateIssueSchema
} from "./issue.schema";

export default async function issueRoutes(app: FastifyInstance) {
  app.get("/issues", async (request) => {
    const ctx = requireAuth(request);
    const query = listIssuesQuerySchema.parse(request.query);
    return ok(await app.container.issueQuery.list(query, ctx));
  });

  app.post("/issues", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createIssueSchema.parse(request.body);
    const entity = await app.container.issueCommand.create(body, ctx);
    return reply.status(201).send(ok(entity, "issue created"));
  });

  app.get("/issues/:issueId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    return ok(await app.container.issueQuery.getById(params.issueId, ctx));
  });

  app.get("/issues/:issueId/logs", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    return ok({ items: await app.container.issueQuery.listLogs(params.issueId, ctx) });
  });

  app.patch("/issues/:issueId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    const body = updateIssueSchema.parse(request.body);
    return ok(await app.container.issueCommand.update(params.issueId, body, ctx));
  });

  app.post("/issues/:issueId/assign", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    const body = assignIssueSchema.parse(request.body);
    return ok(await app.container.issueCommand.assign(params.issueId, body, ctx), "issue assigned");
  });

  app.post("/issues/:issueId/claim", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    return ok(await app.container.issueCommand.claim(params.issueId, ctx), "issue claimed");
  });

  app.post("/issues/:issueId/start", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    return ok(await app.container.issueCommand.start(params.issueId, ctx), "issue started");
  });

  app.post("/issues/:issueId/resolve", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    const body = resolveIssueSchema.parse(request.body);
    return ok(await app.container.issueCommand.resolve(params.issueId, body, ctx), "issue resolved");
  });

  app.post("/issues/:issueId/verify", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    return ok(await app.container.issueCommand.verify(params.issueId, ctx), "issue verified");
  });

  app.post("/issues/:issueId/reopen", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    const body = reopenIssueSchema.parse(request.body);
    return ok(await app.container.issueCommand.reopen(params.issueId, body, ctx), "issue reopened");
  });

  app.post("/issues/:issueId/close", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    const body = closeIssueSchema.parse(request.body);
    return ok(await app.container.issueCommand.close(params.issueId, body, ctx), "issue closed");
  });
}
