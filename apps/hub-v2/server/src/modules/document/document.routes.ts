import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { createRequestContext } from "../../shared/context/request-context";
import { ok } from "../../shared/http/response";
import { createDocumentSchema, listDocumentsQuerySchema, updateDocumentSchema } from "./document.schema";

export default async function documentRoutes(app: FastifyInstance) {
  app.get("/documents", async (request) => {
    const ctx = requireAuth(request);
    const query = listDocumentsQuerySchema.parse(request.query);
    return ok(await app.container.documentQuery.list(query, ctx));
  });

  app.post("/documents", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createDocumentSchema.parse(request.body);
    const entity = await app.container.documentCommand.create(body, ctx);
    return reply.status(201).send(ok(entity, "document created"));
  });

  app.get("/documents/:documentId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { documentId: string };
    return ok(await app.container.documentQuery.getById(params.documentId, ctx));
  });

  app.patch("/documents/:documentId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { documentId: string };
    const body = updateDocumentSchema.parse(request.body);
    return ok(await app.container.documentCommand.update(params.documentId, body, ctx));
  });

  app.post("/documents/:documentId/publish", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { documentId: string };
    return ok(await app.container.documentCommand.publish(params.documentId, ctx), "document published");
  });

  app.post("/documents/:documentId/archive", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { documentId: string };
    return ok(await app.container.documentCommand.archive(params.documentId, ctx), "document archived");
  });
}
