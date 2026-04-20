import type { FastifyInstance } from "fastify";
import { createRequestContext } from "../../shared/context/request-context";
import { ok } from "../../shared/http/response";
import { documentProjectSlugParamSchema, listDocumentsQuerySchema } from "./document.schema";

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

  app.get("/documents/:projectKey/:slug", async (request) => {
    const params = documentProjectSlugParamSchema.parse(request.params);
    return ok(await app.container.documentQuery.getPublicByProjectAndSlug(params.projectKey, params.slug));
  });
}
