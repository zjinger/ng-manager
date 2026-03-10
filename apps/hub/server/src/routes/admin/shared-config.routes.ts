import type { FastifyInstance } from "fastify";
import {
  createSharedConfigSchema,
  listSharedConfigQuerySchema,
  resolveSharedConfigQuerySchema,
  updateSharedConfigSchema
} from "../../modules/shared-config/shared-config.schema";
import { ok } from "../../utils/response";

export default async function adminSharedConfigRoutes(fastify: FastifyInstance) {
  fastify.get("/shared-configs", async (request) => {
    const query = listSharedConfigQuerySchema.parse(request.query);
    const result = fastify.services.sharedConfig.list(query);
    return ok(result);
  });

  fastify.get("/shared-configs/resolve", async (request) => {
    const query = resolveSharedConfigQuerySchema.parse(request.query);
    const result = fastify.services.sharedConfig.resolve(query);
    return ok(result);
  });

  fastify.get("/shared-configs/:id", async (request) => {
    const params = request.params as { id: string };
    const item = fastify.services.sharedConfig.getById(params.id);
    return ok(item);
  });

  fastify.post("/shared-configs", async (request, reply) => {
    const body = createSharedConfigSchema.parse(request.body);
    const item = fastify.services.sharedConfig.create(body);
    reply.code(201);
    return ok(item);
  });

  fastify.patch("/shared-configs/:id", async (request) => {
    const params = request.params as { id: string };
    const body = updateSharedConfigSchema.parse(request.body);
    const item = fastify.services.sharedConfig.update(params.id, body);
    return ok(item);
  });

  fastify.delete("/shared-configs/:id", async (request) => {
    const params = request.params as { id: string };
    fastify.services.sharedConfig.remove(params.id);
    return ok(true);
  });
}