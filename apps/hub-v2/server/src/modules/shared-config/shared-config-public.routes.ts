import type { FastifyInstance } from "fastify";
import { createRequestContext } from "../../shared/context/request-context";
import { ok } from "../../shared/http/response";
import { publicSharedConfigsQuerySchema } from "./shared-config.schema";

export default async function sharedConfigPublicRoutes(app: FastifyInstance) {
  app.get("/shared-configs", async (request) => {
    const query = publicSharedConfigsQuerySchema.parse(request.query);
    const ctx = createRequestContext({
      accountId: "public",
      roles: [],
      source: "http",
      requestId: request.id,
      ip: request.ip
    });

    return ok({ items: await app.container.sharedConfigQuery.listPublic(query, ctx) });
  });
}
