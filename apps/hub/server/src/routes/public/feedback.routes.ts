import type { FastifyInstance } from "fastify";
import { createFeedbackSchema } from "../../modules/feedback/feedback.schema";
import { ok } from "../../utils/response";

function resolveClientIp(request: any) {
  const xf = request.headers?.["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0]?.trim() || undefined;
  }
  return request.ip || request.socket?.remoteAddress || undefined;
}

export default async function publicFeedbackRoutes(fastify: FastifyInstance) {
  fastify.post("/feedbacks", async (request, reply) => {
    const body = createFeedbackSchema.parse(request.body);

    const item = fastify.services.feedback.submit({
      projectKey: body.projectKey ?? null,
      source: body.source,
      category: body.category,
      title: body.title,
      content: body.content,
      contact: body.contact,
      clientName: body.clientName,
      clientVersion: body.clientVersion,
      osInfo: body.osInfo,
      clientIp: body.clientIp ?? resolveClientIp(request)
    });

    return reply.status(201).send(ok(item, "feedback submitted"));
  });
}
