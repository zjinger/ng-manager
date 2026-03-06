import type { FastifyInstance } from "fastify";
import {
  listFeedbackQuerySchema,
  updateFeedbackStatusSchema
} from "../../modules/feedback/feedback.schema";
import { ok } from "../../utils/response";

export default async function adminFeedbackRoutes(fastify: FastifyInstance) {
  fastify.get("/feedbacks", async (request) => {
    const query = listFeedbackQuerySchema.parse(request.query);
    const result = fastify.services.feedback.list(query);
    return ok(result);
  });

  fastify.get("/feedbacks/:id", async (request) => {
    const params = request.params as { id: string };
    const item = fastify.services.feedback.getById(params.id);
    return ok(item);
  });

  fastify.put("/feedbacks/:id/status", async (request) => {
    const params = request.params as { id: string };
    const body = updateFeedbackStatusSchema.parse(request.body);
    const item = fastify.services.feedback.changeStatus(params.id, body);
    return ok(item, "feedback status updated");
  });
}