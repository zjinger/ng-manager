import type { FastifyInstance } from "fastify";
import { createFeedbackSchema } from "../../modules/feedback/feedback.schema";
import { ok } from "../../utils/response";

export default async function publicFeedbackRoutes(fastify: FastifyInstance) {
  fastify.post("/feedbacks", async (request, reply) => {
    const body = createFeedbackSchema.parse(request.body);
    const item = fastify.services.feedback.submit(body);
    return reply.status(201).send(ok(item, "feedback submitted"));
  });
}