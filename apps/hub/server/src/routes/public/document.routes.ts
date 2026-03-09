import type { FastifyInstance } from "fastify";
import {
  publicDocumentDetailQuerySchema,
  publicListDocumentQuerySchema
} from "../../modules/document/document.schema";
import { ok } from "../../utils/response";

export default async function publicDocumentRoutes(fastify: FastifyInstance) {
  fastify.get("/documents", async (request) => {
    const query = publicListDocumentQuerySchema.parse(request.query);

    const result = fastify.services.document.listPublic({
      projectKey: query.projectKey,
      includeGlobal: query.includeGlobal,
      category: query.category,
      keyword: query.keyword,
      page: query.page,
      pageSize: query.pageSize
    });

    return ok(result);
  });

  fastify.get("/documents/:slug", async (request) => {
    const params = request.params as { slug: string };
    const query = publicDocumentDetailQuerySchema.parse(request.query);

    const item = fastify.services.document.getPublicBySlug(
      params.slug,
      query.projectKey
    );

    return ok(item);
  });
}