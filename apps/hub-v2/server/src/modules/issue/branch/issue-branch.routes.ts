import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../shared/auth/require-auth";
import { ok } from "../../../shared/http/response";
import { completeIssueBranchSchema, createIssueBranchSchema, startOwnIssueBranchSchema } from "./issue-branch.schema";

export default async function issueBranchRoutes(app: FastifyInstance) {
  app.get("/issues/:issueId/branches", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    return ok({ items: await app.container.issueBranchQuery.list(params.issueId, ctx) });
  });

  app.post("/issues/:issueId/branches", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    const body = createIssueBranchSchema.parse(request.body);
    const entity = await app.container.issueBranchCommand.create(params.issueId, body, ctx);
    return reply.status(201).send(ok(entity, "issue branch created"));
  });

  app.post("/issues/:issueId/branches/start-mine", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    const body = startOwnIssueBranchSchema.parse(request.body);
    const entity = await app.container.issueBranchCommand.startMine(params.issueId, body, ctx);
    return reply.status(201).send(ok(entity, "issue branch started"));
  });

  app.post("/issues/:issueId/branches/:branchId/start", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string; branchId: string };
    return ok(await app.container.issueBranchCommand.start(params.issueId, params.branchId, ctx), "issue branch started");
  });

  app.post("/issues/:issueId/branches/:branchId/complete", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string; branchId: string };
    const body = completeIssueBranchSchema.parse(request.body);
    return ok(
      await app.container.issueBranchCommand.complete(params.issueId, params.branchId, body, ctx),
      "issue branch completed"
    );
  });
}
