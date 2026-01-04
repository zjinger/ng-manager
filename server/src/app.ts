import Fastify from "fastify";
import corePlugin from "./plugins/core.plugin";
import taskRoutes from "./plugins/task.routes";
import wsPlugin from "./plugins/ws.plugin";
import systemRoutes from "./plugins/system.routes";
import requestIdPlugin from "./plugins/request-id.plugin";
import { errorHandlerPlugin } from "./plugins/error-handler.plugin";

export async function createServer() {
    const fastify = Fastify({
        logger: true,
        genReqId: (req) => {
            // 优先使用前端传入的 X-Request-Id
            const hdr = req.headers["x-request-id"];
            if (typeof hdr === "string" && hdr.trim()) return hdr.trim();
            return crypto.randomUUID();
        }
    });

    //  先装这些基础插件：request-id + error handler
    await fastify.register(requestIdPlugin);
    await fastify.register(errorHandlerPlugin);

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
