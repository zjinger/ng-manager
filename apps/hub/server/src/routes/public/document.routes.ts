import type { FastifyInstance } from "fastify";
import { listDocumentQuerySchema } from "../../modules/document/document.schema";
import { ok } from "../../utils/response";

export default async function publicDocumentRoutes(fastify: FastifyInstance) {
  fastify.get("/documents", async (request) => {
    const query = listDocumentQuerySchema
      .omit({ status: true })
      .parse(request.query);

    const result = fastify.services.document.listPublic(query);
    return ok(result);
  });

  fastify.get("/documents/:slug", async (request) => {
    const params = request.params as { slug: string };
    const item = fastify.services.document.getPublicBySlug(params.slug);
    return ok(item);
  });
}