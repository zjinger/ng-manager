import type { FastifyInstance } from "fastify";
import { createRequestContext } from "../../shared/context/request-context";
import { ok } from "../../shared/http/response";
import { createSurveySubmissionSchema } from "./survey.schema";

export default async function surveyPublicRoutes(app: FastifyInstance) {
  app.get("/surveys/:slug", async (request) => {
    const params = request.params as { slug: string };
    const userAgentHeader = request.headers["user-agent"];
    const userAgent = typeof userAgentHeader === "string" ? userAgentHeader : userAgentHeader?.[0];
    const ctx = createRequestContext({
      accountId: "public",
      roles: [],
      source: "http",
      requestId: request.id,
      ip: request.ip,
      userAgent
    });
    return ok(await app.container.surveyQuery.getPublicBySlug(params.slug, ctx));
  });

  app.post("/surveys/:slug/submissions", async (request, reply) => {
    const params = request.params as { slug: string };
    const body = createSurveySubmissionSchema.parse(request.body);
    const userAgentHeader = request.headers["user-agent"];
    const userAgent = typeof userAgentHeader === "string" ? userAgentHeader : userAgentHeader?.[0];
    const ctx = createRequestContext({
      accountId: "public",
      roles: [],
      source: "http",
      requestId: request.id,
      ip: request.ip,
      userAgent
    });

    const entity = await app.container.surveyCommand.submitPublicBySlug(params.slug, body, ctx);
    return reply.status(201).send(ok(entity, "survey submission created"));
  });
}
