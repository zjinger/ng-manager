import type { FastifyInstance } from "fastify";

export default async function systemRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => ({ ok: true, ts: Date.now() }));
}
