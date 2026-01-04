import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { AppError, type ErrorCode } from "@core";

/**
 * 错误码到 HTTP 状态码映射
 */
export const ERROR_STATUS: Record<ErrorCode, number> = {
    PROJECT_NOT_FOUND: 404,
    TASK_NOT_FOUND: 404,

    PROJECT_ALREADY_EXISTS: 409,
    TASK_ALREADY_RUNNING: 409,

    PROJECT_ROOT_INVALID: 400,

    PROCESS_SPAWN_FAILED: 500,
    STORAGE_IO_ERROR: 500,
};

export function mapStatus(code: ErrorCode): number {
    return ERROR_STATUS[code] ?? 400;
}

/**
 * 构建错误响应体
 */
function buildErrorBody(reqId: string | undefined, code: string, message: string, details?: any) {
    return {
        ok: false as const,
        error: {
            code,
            message,
            ...(details !== undefined ? { details } : {}),
        },
        meta: {
            requestId: reqId,
            ts: Date.now(),
        },
    };
}

/**
 * 全局错误处理插件： 将错误转换为标准响应体
 * - 业务错误（AppError）按其 code 映射状态码
 * - schema 校验错误返回 400
 * - 其他未知错误返回 500，并记录日志
 */
export const errorHandlerPlugin: FastifyPluginAsync = fp(async (app) => {
    app.setErrorHandler((err, req, reply) => {
        const requestId = req.id;

        // 1) core 业务错误
        if (err instanceof AppError || isCoreAppError(err)) {
            const status = mapStatus(err.code as ErrorCode);
            return reply.status(status).send(buildErrorBody(requestId, err.code, err.message, err.meta));
        }

        // 2) Fastify schema 校验错误
        // @ts-expect-error fastify error typing
        if (err?.validation) {
            return reply
                .status(400)
                // @ts-expect-error
                .send(buildErrorBody(requestId, "VALIDATION_ERROR", "参数不合法", err.validation));
        }

        // 3) 未知错误：只记录日志
        req.log.error({ err, requestId }, "Unhandled error");
        return reply.status(500).send(buildErrorBody(requestId, "INTERNAL_ERROR", "服务异常，请稍后重试"));
    });
});


function isCoreAppError(err: any): err is { code: string; message: string; meta?: any } {
    return err && typeof err === "object" && typeof err.code === "string" && typeof err.message === "string";
}

export default errorHandlerPlugin;
