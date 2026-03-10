import type { FastifyInstance } from "fastify";
import {
  createReleaseSchema,
  listReleaseQuerySchema,
  publishReleaseSchema,
  updateReleaseSchema
} from "../../modules/release/release.schema";
import { ok } from "../../utils/response";

export default async function adminReleaseRoutes(fastify: FastifyInstance) {
  fastify.get("/releases", async (request) => {
    const query = listReleaseQuerySchema.parse(request.query);
    const result = fastify.services.release.list(query);
    return ok(result);
  });

  fastify.get("/releases/:id", async (request) => {
    const params = request.params as { id: string };
    const item = fastify.services.release.getById(params.id);
    return ok(item);
  });

  fastify.post("/releases", async (request, reply) => {
    const body = createReleaseSchema.parse(request.body);
    const item = fastify.services.release.create(body);
    return reply.status(201).send(ok(item, "release created"));
  });

  fastify.put("/releases/:id", async (request) => {
    const params = request.params as { id: string };
    const body = updateReleaseSchema.parse(request.body);
    const item = fastify.services.release.update(params.id, body);
    return ok(item, "release updated");
  });

  fastify.post("/releases/:id/publish", async (request) => {
    const params = request.params as { id: string };
    const body = publishReleaseSchema.parse(request.body ?? {});
    const item = fastify.services.release.publish(params.id, body.publishedAt);
    return ok(item, "release published");
  });

  fastify.post("/releases/:id/deprecate", async (request) => {
    const params = request.params as { id: string };
    const item = fastify.services.release.deprecate(params.id);
    return ok(item, "release deprecated");
  });

  fastify.delete("/releases/:id", async (request) => {
    const params = request.params as { id: string };
    fastify.services.release.remove(params.id);
    return ok({ id: params.id }, "release deleted");
  });
}