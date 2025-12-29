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
    await fastify.register(taskRoutes, { prefix: '/api' });

    return fastify;
}
