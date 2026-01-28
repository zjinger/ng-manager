import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

export const requestIdPlugin: FastifyPluginAsync = fp(async (app) => {
    // 让 req.id 优先使用前端传入的 X-Request-Id
    // 注意：Fastify 的 genReqId 只能在 Fastify() 初始化时配置
    // 只负责“回传 header”
    app.addHook("onSend", async (req, reply, payload) => {
        reply.header("X-Request-Id", req.id);
        return payload;
    });
});

export default requestIdPlugin;