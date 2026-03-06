import type { FastifyInstance } from "fastify";
import {
  createSharedConfigSchema,
  listSharedConfigQuerySchema,
  updateSharedConfigSchema
} from "../../modules/shared-config/shared-config.schema";
import { ok } from "../../utils/response";

export default async function adminSharedConfigRoutes(fastify: FastifyInstance) {
  fastify.get("/configs", async (request) => {
    const query = listSharedConfigQuerySchema.parse(request.query);
    const result = fastify.services.sharedConfig.list(query);
    return ok(result);
  });

  fastify.get("/configs/:id", async (request) => {
    const params = request.params as { id: string };
    const item = fastify.services.sharedConfig.getById(params.id);
    return ok(item);
  });

  fastify.post("/configs", async (request, reply) => {
    const body = createSharedConfigSchema.parse(request.body);
    const item = fastify.services.sharedConfig.create(body);
    return reply.status(201).send(ok(item, "shared config created"));
  });

  fastify.put("/configs/:id", async (request) => {
    const params = request.params as { id: string };
    const body = updateSharedConfigSchema.parse(request.body);
    const item = fastify.services.sharedConfig.update(params.id, body);
    return ok(item, "shared config updated");
  });

  fastify.delete("/configs/:id", async (request) => {
    const params = request.params as { id: string };
    fastify.services.sharedConfig.remove(params.id);
    return ok({ id: params.id }, "shared config deleted");
  });
}