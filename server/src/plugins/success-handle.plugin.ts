import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

export const successHandlerPlugin: FastifyPluginAsync = fp(async (app) => {
    app.addHook("preSerialization", async (req, reply, payload) => {
        //  非 2xx：不处理（错误已由 errorHandler 接管）
        if (reply.statusCode < 200 || reply.statusCode >= 300) {
            return payload;
        }

        //  没有 payload（204 等）
        if (payload === undefined || payload === null) {
            return payload;
        }

        //  非 JSON（stream / buffer / string）
        const type = reply.getHeader("content-type");
        if (typeof type === "string" && !type.includes("application/json")) {
            return payload;
        }

        //  已经是标准结构（ok:true/false），不重复包
        if (
            typeof payload === "object" &&
            payload !== null &&
            "ok" in (payload as any)
        ) {
            return payload;
        }

        // 统一包装成功返回
        return {
            ok: true,
            data: payload,
            meta: {
                requestId: req.id,
                ts: Date.now(),
            },
        };
    });
});

export default successHandlerPlugin;
