import type { FastifyInstance } from "fastify";
import { ok } from "../../shared/http/response";
import { createRequestContext } from "../../shared/context/request-context";
import { createFeedbackSchema } from "./feedback.schema";

function resolveClientIp(request: { headers?: Record<string, unknown>; ip?: string; socket?: { remoteAddress?: string } }) {
  const forwarded = request.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || undefined;
  }
  return request.ip || request.socket?.remoteAddress || undefined;
}

export default async function feedbackPublicRoutes(app: FastifyInstance) {
  app.post("/feedbacks", async (request, reply) => {
    const body = createFeedbackSchema.parse(request.body);

    const item = await app.container.feedbackCommand.submit(
      {
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
      },
      createRequestContext({
        source: "http",
        ip: request.ip,
        requestId: request.id
      })
    );

    return reply.status(201).send(ok(item, "feedback submitted"));
  });
}
