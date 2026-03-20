import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../shared/auth/require-auth";
import { ok } from "../../../shared/http/response";
import { createIssueCommentSchema } from "./issue-comment.schema";

export default async function issueCommentRoutes(app: FastifyInstance) {
  app.get("/issues/:issueId/comments", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    return ok({ items: await app.container.issueCommentQuery.list(params.issueId, ctx) });
  });

  app.post("/issues/:issueId/comments", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    const body = createIssueCommentSchema.parse(request.body);
    const entity = await app.container.issueCommentCommand.create(params.issueId, body, ctx);
    return reply.status(201).send(ok(entity, "issue comment created"));
  });
}
