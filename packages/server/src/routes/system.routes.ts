import type { FastifyInstance } from "fastify";

export default async function systemRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => (
    {
      ts: Date.now(),
      name: "ngm-server",
      pid: process.pid,
      uptime: process.uptime(),
      version: process.env.npm_package_version,
      dataDir: process.env.NGM_DATA_DIR || null
    }
  ));
}
