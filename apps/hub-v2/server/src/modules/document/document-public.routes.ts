import type { FastifyInstance } from "fastify";
import { createRequestContext } from "../../shared/context/request-context";
import { ok } from "../../shared/http/response";
import { listDocumentsQuerySchema } from "./document.schema";

export default async function documentPublicRoutes(app: FastifyInstance) {
  app.get("/documents", async (request) => {
    const query = listDocumentsQuerySchema.parse(request.query);
    const ctx = createRequestContext({
      accountId: "public",
      roles: [],
      source: "http",
      requestId: request.id,
      ip: request.ip
    });
    return ok(await app.container.documentQuery.listPublic(query, ctx));
  });
}
