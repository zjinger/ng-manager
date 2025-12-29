// src/server/app.ts

import Fastify from "fastify";
import corePlugin from "./plugins/core.plugin";
import taskRoutes from "./plugins/task.routes";
import wsPlugin from "./plugins/ws.plugin";
import systemRoutes from "./plugins/system.routes";

export async function createServer() {
    const fastify = Fastify({
        logger: true,
    });
    // core
    await fastify.register(corePlugin);
    // 先 websocket，再 routes（尤其 ws 路由）
    await fastify.register(wsPlugin);
    // system
    await fastify.register(systemRoutes);
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
