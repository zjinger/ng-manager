import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../shared/auth/require-auth";
import { ok } from "../../../shared/http/response";
import { addIssueParticipantSchema } from "./issue-participant.schema";

export default async function issueParticipantRoutes(app: FastifyInstance) {
  app.get("/issues/:issueId/participants", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    return ok({ items: await app.container.issueParticipantQuery.list(params.issueId, ctx) });
  });

  app.post("/issues/:issueId/participants", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string };
    const body = addIssueParticipantSchema.parse(request.body);
    const entity = await app.container.issueParticipantCommand.add(params.issueId, body, ctx);
    return reply.status(201).send(ok(entity, "issue participant added"));
  });

  app.delete("/issues/:issueId/participants/:participantId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { issueId: string; participantId: string };
    return ok(
      await app.container.issueParticipantCommand.remove(params.issueId, params.participantId, ctx),
      "issue participant removed"
    );
  });
}
