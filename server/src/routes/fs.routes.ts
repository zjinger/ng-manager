import type { FastifyInstance } from "fastify";

export default async function fsRoutes(fastify: FastifyInstance) {

    fastify.get("/ls", async (req) => {
        const q = req.query as { path?: string; showSystem?: "0" | "1" | boolean };

        const showSystem =
            q.showSystem === "1" || q.showSystem === true || q.showSystem === ("true" as any);

        return fastify.core.fs.ls(q.path || "", { showSystem, detectProject: true, detectConcurrency: 8 });
    });

    fastify.post("/mkdir", async (req) => {
        const body = req.body as { path?: string; name?: string };
        return fastify.core.fs.mkdir(body?.path || "", body?.name || "");
    });
}
