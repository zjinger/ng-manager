import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { listFeedbacksQuerySchema, updateFeedbackStatusSchema } from "./feedback.schema";

export default async function feedbackRoutes(app: FastifyInstance) {
  app.get("/feedbacks", async (request) => {
    const ctx = requireAuth(request);
    const query = listFeedbacksQuerySchema.parse(request.query);
    return ok(await app.container.feedbackQuery.list(query, ctx));
  });

  app.get("/feedbacks/:feedbackId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { feedbackId: string };
    return ok(await app.container.feedbackQuery.getById(params.feedbackId, ctx));
  });

  app.put("/feedbacks/:feedbackId/status", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { feedbackId: string };
    const body = updateFeedbackStatusSchema.parse(request.body);
    return ok(await app.container.feedbackCommand.changeStatus(params.feedbackId, body, ctx), "feedback status updated");
  });
}
