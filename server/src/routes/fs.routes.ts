import type { FastifyInstance } from "fastify";
import path from "node:path";

export default async function fsRoutes(fastify: FastifyInstance) {

    fastify.get("/ls", async (req) => {
        const q = req.query as { path?: string; showSystem?: "0" | "1" | boolean };

        const showSystem =
            q.showSystem === "1" || q.showSystem === true || q.showSystem === ("true" as any);

        return fastify.core.fs.ls(q.path || "", { showSystem, detectProject: true, detectConcurrency: 8 });
    });

    fastify.post("/mkdir", async (req) => {
        const body = req.body as { path?: string; name?: string };
        return fastify.core.fs.mkdir(body?.path || "", body?.name || "", {
            recursive: true, // 默认支持多级创建
        });
    });

    fastify.get("/path-exists", async (req) => {
        const q = req.query as { path?: string };
        const raw = String(q?.path ?? "").trim();
        if (!raw) return { exists: false };
        // 规范化一下，避免奇怪的相对路径
        const p = path.resolve(raw);
        const exists = await fastify.core.fs.exists(p);
        return { exists };
    });
}
