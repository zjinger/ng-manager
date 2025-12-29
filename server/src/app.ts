// src/server/app.ts

import Fastify from "fastify";
import corePlugin from "./plugins/core.plugin";
import taskRoutes from "./plugins/task.routes";

export async function createServer() {
    const fastify = Fastify({
        logger: true,
    });
    fastify.get("/health", async () => {
        return { ok: true, ts: Date.now() };
    });
    // core
    await fastify.register(corePlugin);

    // routes
    await fastify.register(taskRoutes);

    return fastify;
}

// /* -------------------- standalone start -------------------- */

// if (require.main === module) {
//     (async () => {
//         const server = await createServer();
//         const port = 3000;

//         await server.listen({ port });
//         console.log(`🚀 server listening on http://localhost:${port}`);
//     })();
// }
