import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { AppError, type ErrorCode } from "@core";

/**
 * ErrorCode → HTTP Status 映射
 *
 * 约定：
 * - 4xx：客户端/业务条件不满足
 * - 5xx：服务端/系统错误
 */
export const ERROR_STATUS: Record<ErrorCode, number> = {
    /* ---------------- Project ---------------- */

    PROJECT_NOT_FOUND: 404,
    PROJECT_ROOT_INVALID: 400,
    PROJECT_ALREADY_EXISTS: 409,

    /* ---------------- Project Import ---------------- */

    PROJECT_IMPORT_NOT_EXISTS: 404,            // 路径不存在
    PROJECT_IMPORT_NOT_DIR: 400,               // 不是目录
    PROJECT_IMPORT_ALREADY_REGISTERED: 409,    // 已导入
    PROJECT_IMPORT_NOT_RECOGNIZED: 422,         // 不像项目（语义错误）
    PROJECT_IMPORT_SCAN_FAILED: 500,            // 扫描失败（IO/解析）

    /* ---------------- Project Creation ---------------- */

    INVALID_NAME: 400,                          // 无效的项目名称
    TARGET_EXISTS: 409,                         // 目标路径已存在
    INVALID_REPO_URL: 400,                      // 无效的仓库地址
    INVALID_PARENT_DIR: 400,                    // 无效的父目录

    /* ---------------- Project Analysis ---------------- */
    PROJECT_ANGULAR_JSON_INVALID: 400,          // angular.json 无效
    PROJECT_VITE_CONFIG_INVALID: 400,           // vite 配置无效


    /* ---------------- Config ---------------- */
    CONFIG_BACKUP_NOT_FOUND: 404,               // 配置备份不存在
    CONFIG_READ_FAILED: 500,                    // 配置读取失败


    /* ---------------- Task / Process ---------------- */

    TASK_NOT_FOUND: 404,
    TASK_ALREADY_RUNNING: 409,
    PROCESS_SPAWN_FAILED: 500,
    TASK_SPEC_NOT_FOUND: 404,
    TASK_NOT_RUNNABLE: 400,
    RUN_NOT_FOUND: 404,
    TASK_ID_REQUIRED: 400,

    // WS 
    BAD_JSON: 400,
    BAD_MSG: 400,
    OP_NOT_SUPPORTED: 400,
    HANDLER_FAILED: 500,
    TOPIC_NOT_FOUND: 404,
    OP_NOT_FOUND: 400,
    /* ---------------- File System ---------------- */

    FS_NOT_FOUND: 404,
    FS_ALREADY_EXISTS: 409,
    FS_PERMISSION_DENIED: 403,
    FS_EXISTS_FAILED: 500,

    /* ---------------- Editor ---------------- */

    EDITOR_NOT_FOUND: 404,
    EDITOR_LAUNCH_FAILED: 500,

    /* ---------------- Infra / Auth ---------------- */

    STORAGE_IO_ERROR: 500,
    UNAUTHORIZED: 401,
    INVALID_TIMESTAMP: 400, // 时间戳无效

    /* ---------------- Deps ---------------- */
    DEP_INSTALL_FAILED: 500,
    DEP_UNINSTALL_FAILED: 500,
    DEP_NOT_FOUND: 404,

    /* ---------------- Dashboard ---------------- */
    DASHBOARD_CONFLICT: 409,
    WIDGET_NOT_FOUND: 404,
    WIDGET_LOCKED: 423,


    /* ---------------- Fallback ---------------- */
    UNKNOWN_ERROR: 500,

    /* ---------------- Generic ---------------- */
    BAD_REQUEST: 400,
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
