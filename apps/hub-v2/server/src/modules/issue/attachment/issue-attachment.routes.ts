import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../shared/auth/require-auth";
import { ok } from "../../../shared/http/response";
import { createIssueAttachmentSchema } from "./issue-attachment.schema";

export default async function issueAttachmentRoutes(app: FastifyInstance) {
  app.get("/issues/:issueId/attachments", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    return ok({ items: await app.container.issueAttachmentQuery.list(params.issueId, ctx) });
  });

  app.post("/issues/:issueId/attachments", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    const body = createIssueAttachmentSchema.parse(request.body);
    const entity = await app.container.issueAttachmentCommand.create(params.issueId, body, ctx);
    return reply.status(201).send(ok(entity, "issue attachment created"));
  });

  app.delete("/issues/:issueId/attachments/:attachmentId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string; attachmentId: string };
    return ok(
      await app.container.issueAttachmentCommand.remove(params.issueId, params.attachmentId, ctx),
      "issue attachment removed"
    );
  });
}
