import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import { createReleaseSchema, listReleasesQuerySchema, updateReleaseSchema } from "./release.schema";

export default async function releaseRoutes(app: FastifyInstance) {
  app.get("/releases", async (request) => {
    const ctx = requireAuth(request);
    const query = listReleasesQuerySchema.parse(request.query);
    return ok(await app.container.releaseQuery.list(query, ctx));
  });

  app.post("/releases", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createReleaseSchema.parse(request.body);
    const entity = await app.container.releaseCommand.create(body, ctx);
    return reply.status(201).send(ok(entity, "release created"));
  });

  app.get("/releases/:releaseId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { releaseId: string };
    return ok(await app.container.releaseQuery.getById(params.releaseId, ctx));
  });

  app.patch("/releases/:releaseId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { releaseId: string };
    const body = updateReleaseSchema.parse(request.body);
    return ok(await app.container.releaseCommand.update(params.releaseId, body, ctx));
  });

  app.post("/releases/:releaseId/publish", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { releaseId: string };
    return ok(await app.container.releaseCommand.publish(params.releaseId, ctx), "release published");
  });

  app.post("/releases/:releaseId/archive", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { releaseId: string };
    return ok(await app.container.releaseCommand.archive(params.releaseId, ctx), "release archived");
  });
}
