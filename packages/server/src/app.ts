import Fastify, { FastifyBaseLogger } from "fastify";
import corePlugin from "./plugins/core.plugin";
import { errorHandlerPlugin } from "./plugins/error-handler.plugin";
import requestIdPlugin from "./plugins/request-id.plugin";
import routesPlugin from "./plugins/routes.plugin";
import staticPlugin from "./plugins/static.plugin";
import successHandlerPlugin from "./plugins/success-handle.plugin";
import wsPlugin from "./plugins/ws/ws.plugin";
import apiClientPlugin from "./plugins/api-client.plugin";
function normalizeLogLevel(v?: string) {
    // pino levels: fatal error warn info debug trace silent
    const lv = (v ?? "").toLowerCase().trim();
    if (!lv) return undefined;
    if (["fatal", "error", "warn", "info", "debug", "trace", "silent"].includes(lv)) return lv;
    return "info";
}
function createFastifyLogger(): false | FastifyBaseLogger | undefined {
    const level = normalizeLogLevel(process.env.NGM_LOG_LEVEL);

    // 1) 未指定级别 => 默认关闭（安静）
    if (!level) return false;

    // 2) dev 下可读输出（需要安装 pino-pretty）
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
        return {
            level,
            transport: {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    translateTime: "HH:MM:ss.l",
                    ignore: "pid,hostname",
                },
            },
        } as any;
    }

    // 3) prod 下输出 JSON（结构化）
    return { level } as any;
}
export async function createServer() {
    const fastify = Fastify({
        logger: createFastifyLogger(),
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

    // websocket
    await fastify.register(wsPlugin);

    // api client
    await fastify.register(apiClientPlugin);

    // routes
    await fastify.register(routesPlugin);

    // www
    await fastify.register(staticPlugin);

    // 关闭钩子
    fastify.addHook('onClose', async () => {
        // 在这里执行任何需要在服务器关闭时完成的异步操作
        // 例如，关闭数据库连接、清理资源等
        await fastify.core.dispose?.();
        fastify.log.info('Server is closing, performing cleanup...');
    });

    return fastify;
}
