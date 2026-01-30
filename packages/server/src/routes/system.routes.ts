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

  fastify.post("/shutdown", async () => {
    fastify.log.info("Shutdown requested via /shutdown");

    // 异步关闭，避免阻塞响应
    setTimeout(async () => {
      try {
        await fastify.close(); // ← 会触发 onClose
        process.exit(0);
      } catch (e) {
        console.error("Graceful shutdown failed", e);
        process.exit(1);
      }
    }, 50);

    return { ok: true };
  });
}
