import type { FastifyInstance, FastifyRequest } from "fastify";
import { env } from "../env";

function isLocalAddress(ip?: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1'
  );
}

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

  fastify.post("/shutdown", async (request: FastifyRequest, reply) => {
    // localhost 限制
    if (!isLocalAddress(request.ip)) {
      fastify.log.warn(`Shutdown rejected: not localhost (${request.ip})`);
      return reply.code(403).send({ ok: false, error: 'Localhost only' });
    }

    const token = request.headers["x-ngm-shutdown-token"] as string | undefined;
    const expected = env.shutdownToken;

    // 强制要求 token
    if (!expected) {
      fastify.log.warn("Shutdown rejected: no shutdown token configured");
      return reply.code(403).send({ ok: false, error: 'Shutdown token required' });
    }

    if (token !== expected) {
      fastify.log.warn("Shutdown rejected: invalid token");
      return reply.code(403).send({ ok: false, error: 'Invalid shutdown token' });
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
