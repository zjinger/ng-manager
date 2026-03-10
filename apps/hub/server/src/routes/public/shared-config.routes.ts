import type { FastifyInstance } from "fastify";
import { ok } from "../../utils/response";
import { resolveSharedConfigQuerySchema } from "../../modules/shared-config/shared-config.schema";
export default async function publicSharedConfigRoutes(fastify: FastifyInstance) {
  fastify.get("/shared-configs/resolve", async (request) => {
    const query = resolveSharedConfigQuerySchema.parse(request.query);
    const result = fastify.services.sharedConfig.resolve(query);
    return ok(result);
  });
}