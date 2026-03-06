import type { FastifyInstance } from "fastify";
import { ok } from "../../utils/response";

export default async function publicSharedConfigRoutes(fastify: FastifyInstance) {
  fastify.get("/configs", async () => {
    const result = fastify.services.sharedConfig.listPublic();
    return ok(result);
  });

  fastify.get("/configs/:key", async (request) => {
    const params = request.params as { key: string };
    const item = fastify.services.sharedConfig.getPublicByKey(params.key);
    return ok(item);
  });
}