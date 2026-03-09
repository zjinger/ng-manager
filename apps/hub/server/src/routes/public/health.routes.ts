import type { FastifyInstance } from "fastify";
import { ok } from "../../utils/response";

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => {
    return ok({
      ok: true,
      service: "ngm-hub-server",
      version: "0.1.0",
      wsEnabled: true,
      time: new Date().toISOString()
    });
  });
}