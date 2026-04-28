import type { FastifyInstance } from "fastify";
import { env } from "../env";

export default async function systemRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => (
    {
      ts: Date.now(),
      name: "ngm-server",
      pid: process.pid,
      uptime: process.uptime(),
      version: process.env.npm_package_version,
      dataDir: env.dataDir
    }
  ));

  fastify.post("/shutdown", async (request) => {
    const token = request.headers["x-ngm-shutdown-token"] as string | undefined;

    if (env.shutdownToken && env.shutdownToken !== token) {
      fastify.log.warn("Shutdown rejected: invalid token");
      return { ok: false, error: "Invalid shutdown token" };
    }

    fastify.log.info("Shutdown requested via /shutdown");

    setTimeout(async () => {
      try {
        await fastify.close();
        process.exit(0);
      } catch (e) {
        console.error("Graceful shutdown failed", e);
        process.exit(1);
      }
    }, 50);

    return { ok: true };
  });
}
