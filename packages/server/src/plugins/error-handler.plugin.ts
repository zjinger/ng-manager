import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { AppError, CoreErrorCodes, GlobalErrorCodes, type ErrorCode } from "@yinuo-ngm/core";

/**
 * ErrorCode (numeric) → HTTP Status 映射
 *
 * 约定：
 * - 4xx：客户端/业务条件不满足
 * - 5xx：服务端/系统错误
 */
export const ERROR_STATUS: Partial<Record<ErrorCode, number>> = {
    /* ---------------- Global 1XXXX ---------------- */
    [GlobalErrorCodes.UNKNOWN_ERROR]: 500,
    [GlobalErrorCodes.BAD_REQUEST]: 400,
    [GlobalErrorCodes.NOT_FOUND]: 404,
    [GlobalErrorCodes.NOT_IMPLEMENTED]: 501,
    [GlobalErrorCodes.STORAGE_IO_ERROR]: 500,
    [GlobalErrorCodes.FS_PATH_NOT_FOUND]: 404,
    [GlobalErrorCodes.FS_PERMISSION_DENIED]: 403,
    [GlobalErrorCodes.FS_ALREADY_EXISTS]: 409,
    [GlobalErrorCodes.FS_INVALID_NAME]: 400,
    [GlobalErrorCodes.FS_MKDIR_FAILED]: 500,
    [GlobalErrorCodes.BAD_JSON]: 400,
    [GlobalErrorCodes.BAD_MSG]: 400,
    [GlobalErrorCodes.OP_NOT_SUPPORTED]: 400,
    [GlobalErrorCodes.TOPIC_NOT_FOUND]: 404,
    [GlobalErrorCodes.HANDLER_FAILED]: 500,
    [GlobalErrorCodes.OP_NOT_FOUND]: 400,
    [GlobalErrorCodes.UNAUTHORIZED]: 401,
    [GlobalErrorCodes.INVALID_TIMESTAMP]: 400,

    /* ---------------- Core Project 22XXX ---------------- */
    [CoreErrorCodes.PROJECT_NOT_FOUND]: 404,
    [CoreErrorCodes.PROJECT_ROOT_INVALID]: 400,
    [CoreErrorCodes.PROJECT_ALREADY_EXISTS]: 409,
    [CoreErrorCodes.PROJECT_ID_REQUIRED]: 400,
    [CoreErrorCodes.PROJECT_IMPORT_NOT_EXISTS]: 404,
    [CoreErrorCodes.PROJECT_IMPORT_NOT_DIR]: 400,
    [CoreErrorCodes.PROJECT_IMPORT_ALREADY_REGISTERED]: 409,
    [CoreErrorCodes.PROJECT_IMPORT_NOT_RECOGNIZED]: 422,
    [CoreErrorCodes.PROJECT_IMPORT_SCAN_FAILED]: 500,
    [CoreErrorCodes.BOOTSTRAP_NOT_IN_PICK_STATE]: 400,
    [CoreErrorCodes.BOOTSTRAP_CTX_NOT_FOUND]: 404,
    [CoreErrorCodes.BOOTSTRAP_INVALID_PICKED_ROOT]: 400,
    [CoreErrorCodes.BOOTSTRAP_NOT_WAITING_PICK]: 400,
    [CoreErrorCodes.INVALID_NAME]: 400,
    [CoreErrorCodes.TARGET_EXISTS]: 409,
    [CoreErrorCodes.INVALID_REPO_URL]: 400,
    [CoreErrorCodes.INVALID_PARENT_DIR]: 400,
    [CoreErrorCodes.GIT_CHECKOUT_FAILED]: 500,
    [CoreErrorCodes.PROJECT_ANGULAR_JSON_INVALID]: 400,
    [CoreErrorCodes.PROJECT_ANGULAR_JSON_NOT_FOUND]: 404,
    [CoreErrorCodes.PROJECT_VITE_CONFIG_INVALID]: 400,
    [CoreErrorCodes.PROJECT_VUE_CONFIG_NOT_FOUND]: 404,
    [CoreErrorCodes.ASSET_NOT_FOUND]: 404,
    [CoreErrorCodes.ASSET_KIND_NOT_SUPPORTED]: 400,
    [CoreErrorCodes.ASSET_URL_REQUIRED]: 400,
    [CoreErrorCodes.ASSET_LABEL_REQUIRED]: 400,
    [CoreErrorCodes.ASSET_URL_INVALID]: 400,
    [CoreErrorCodes.ASSET_MODE_INVALID]: 400,

    /* ---------------- Core Config 4XXXX ---------------- */
    [CoreErrorCodes.CONFIG_BACKUP_NOT_FOUND]: 404,
    [CoreErrorCodes.CONFIG_READ_FAILED]: 500,
    [CoreErrorCodes.CONFIG_WRITE_FAILED]: 500,
    [CoreErrorCodes.CONFIG_CONFLICT]: 409,
    [CoreErrorCodes.CONFIG_OPEN_FAILED]: 500,
    [CoreErrorCodes.CONFIG_SCHEMA_NOT_FOUND]: 404,
    [CoreErrorCodes.CONFIG_DOMAIN_NOT_FOUND]: 404,
    [CoreErrorCodes.CONFIG_DOC_NOT_FOUND]: 404,

    /* ---------------- Core Task 32XXX ---------------- */
    [CoreErrorCodes.TASK_NOT_FOUND]: 404,
    [CoreErrorCodes.RUN_NOT_FOUND]: 404,
    [CoreErrorCodes.TASK_ID_REQUIRED]: 400,
    [CoreErrorCodes.TASK_ALREADY_RUNNING]: 409,
    [CoreErrorCodes.PROCESS_SPAWN_FAILED]: 500,
    [CoreErrorCodes.TASK_SPEC_NOT_FOUND]: 404,
    [CoreErrorCodes.TASK_NOT_RUNNABLE]: 400,
    [CoreErrorCodes.COMMAND_NOT_FOUND]: 404,

    /* ---------------- Core FS 5XXXX ---------------- */
    [CoreErrorCodes.FS_EXISTS_FAILED]: 500,
    [CoreErrorCodes.FS_INVALID_NAME]: 400,
    [CoreErrorCodes.FS_ALREADY_EXISTS]: 409,
    [CoreErrorCodes.FS_PERMISSION_DENIED]: 403,
    [CoreErrorCodes.FS_MKDIR_FAILED]: 500,
    [CoreErrorCodes.FS_PATH_NOT_FOUND]: 404,

    /* ---------------- Core Dashboard 6XXXX ---------------- */
    [CoreErrorCodes.DASHBOARD_CONFLICT]: 409,
    [CoreErrorCodes.WIDGET_NOT_FOUND]: 404,
    [CoreErrorCodes.WIDGET_LOCKED]: 423,

    /* ---------------- Core Sprite 7XXXX ---------------- */
    [CoreErrorCodes.SPRITE_CONFIG_NOT_FOUND]: 404,
    [CoreErrorCodes.SPRITE_GROUP_NOT_FOUND]: 404,
    [CoreErrorCodes.SPRITE_ICONS_ROOT_NOT_FOUND]: 404,

    /* ---------------- Core SVN 8XXXX ---------------- */
    [CoreErrorCodes.SVN_SYNC_ALREADY_RUNNING]: 409,
    [CoreErrorCodes.SVN_SYNC_FAILED]: 500,
    [CoreErrorCodes.SVN_SOURCE_ID_REQUIRED]: 400,

    /* ---------------- Core Deps 9XXXX ---------------- */
    [CoreErrorCodes.DEP_INSTALL_FAILED]: 500,
    [CoreErrorCodes.DEP_UNINSTALL_FAILED]: 500,
    [CoreErrorCodes.DEP_NOT_FOUND]: 404,

    /* ---------------- Core NodeVersion 10XXXX ---------------- */
    [CoreErrorCodes.NO_VERSION_MANAGER]: 503,
    [CoreErrorCodes.SWITCH_VERSION_FAILED]: 500,
    [CoreErrorCodes.NO_AVAILABLE_VERSIONS]: 409,
    [CoreErrorCodes.VERSION_REQUIRED]: 400,
    [CoreErrorCodes.PROJECT_PATH_REQUIRED]: 400,

    /* ---------------- Core Editor 11XXXX ---------------- */
    [CoreErrorCodes.EDITOR_NOT_FOUND]: 404,
    [CoreErrorCodes.EDITOR_LAUNCH_FAILED]: 500,

    /* ---------------- Core RSS / Port Killer 12XXXX ---------------- */
    [CoreErrorCodes.RSS_FETCH_FAILED]: 500,
    [CoreErrorCodes.INVALID_RSS_URL]: 400,
    [CoreErrorCodes.KILL_PORT_FAILED]: 500,
    [CoreErrorCodes.INVALID_PORT]: 400,
};

export function mapStatus(code: ErrorCode): number {
    return ERROR_STATUS[code] ?? 400;
}

/**
 * 构建错误响应体
 */
function buildErrorBody(reqId: string | undefined, code: number, message: string, details?: unknown) {
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
        if (err instanceof AppError || isAppErrorLike(err)) {
            const status = mapStatus(err.code as ErrorCode);
            return reply.status(status).send(buildErrorBody(requestId, err.code, err.message, err.meta));
        }

        // 2) Fastify schema 校验错误
        // @ts-expect-error fastify error typing
        if (err?.validation) {
            return reply
                .status(400)
                // @ts-expect-error
                .send(buildErrorBody(requestId, GlobalErrorCodes.BAD_REQUEST, "参数不合法", err.validation));
        }

        // 3) 未知错误：只记录日志
        console.log('err', err);
        req.log.error({ err, requestId }, "Unhandled error");
        return reply.status(500).send(buildErrorBody(requestId, GlobalErrorCodes.UNKNOWN_ERROR, "服务异常，请稍后重试"));
    });
});


function isAppErrorLike(err: unknown): err is { code: number; message: string; meta?: unknown } {
    return err !== null && typeof err === 'object' && typeof (err as any).code === 'number' && typeof (err as any).message === 'string';
}

export default errorHandlerPlugin;