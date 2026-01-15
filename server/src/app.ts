import Fastify from "fastify";
import corePlugin from "./plugins/core.plugin";
import taskRoutes from "./routes/task.routes";
import wsPlugin from "./plugins/ws/ws.plugin";
import systemRoutes from "./routes/system.routes";
import requestIdPlugin from "./plugins/request-id.plugin";
import { errorHandlerPlugin } from "./plugins/error-handler.plugin";
import projectRoutes from "./routes/project.routes";
import successHandlerPlugin from "./plugins/success-handle.plugin";
import fsRoutes from "./routes/fs.routes";
import depsRoutes from "./routes/deps.route";

export async function createServer() {
    const fastify = Fastify({
        logger: false,
        genReqId: (req) => {
            // 优先使用前端传入的 X-Request-Id
            const hdr = req.headers["x-request-id"];
            if (typeof hdr === "string" && hdr.trim()) return hdr.trim();
            return crypto.randomUUID();
        }
    });

    //  基础插件：request-id + error handler + success handler
    await fastify.register(requestIdPlugin);
    await fastify.register(errorHandlerPlugin);
    await fastify.register(successHandlerPlugin);

    // core
    await fastify.register(corePlugin);
    // 先 websocket，再 routes（尤其 ws 路由）
    await fastify.register(wsPlugin);

    // system
    await fastify.register(systemRoutes);
    // routes
    await fastify.register(taskRoutes, { prefix: '/api/tasks' });
    //projects 
    await fastify.register(projectRoutes, { prefix: '/api/projects' });
    // deps 
    await fastify.register(depsRoutes, { prefix: '/api/deps' });
    // fs
    await fastify.register(fsRoutes, { prefix: '/api/fs' });

    fastify.addHook('onClose', async () => {
        // 在这里执行任何需要在服务器关闭时完成的异步操作
        // 例如，关闭数据库连接、清理资源等
        await fastify.core.dispose?.();
        fastify.log.info('Server is closing, performing cleanup...');
    });

    return fastify;
}
