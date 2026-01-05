import type { ErrorLevel, ErrorAction } from "./error.types";

export const enum ErrorPolicyCode {
    /* ---------- task ---------- */
    TASK_NOT_FOUND = "TASK_NOT_FOUND",
    TASK_ALREADY_RUNNING = "TASK_ALREADY_RUNNING",
    /* ---------- project ---------- */
    PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND",

    /* ---------- fs ---------- */
    FS_ALREADY_EXISTS = "FS_ALREADY_EXISTS",
    FS_NOT_FOUND = "FS_NOT_FOUND",

    /* ---------- system ---------- */
    INTERNAL_ERROR = "INTERNAL_ERROR",
    CONNECTION_LOST = "CONNECTION_LOST",
    HTTP_ERROR = "HTTP_ERROR",
    UNAUTHORIZED = "UNAUTHORIZED",
    UNKNOWN_ERROR = "UNKNOWN_ERROR",

    /* ---------- ws ---------- */
    WS_ERROR = "WS_ERROR",
    WS_CLOSED = "WS_CLOSED",

    /* ---------- protocol / dev ---------- */
    INVALID_JSON = "INVALID_JSON",
    INVALID_MSG = "INVALID_MSG",
}


export type ErrorPolicyItem = {
    level: ErrorLevel;
    message?: string | ((ctx: any) => string);
    action?: ErrorAction;
};

export const ERROR_POLICY: Record<ErrorPolicyCode, ErrorPolicyItem> = {
    /* ---------- task ---------- */

    TASK_NOT_FOUND: {
        level: "silent", // 常见：任务刚结束
    },

    TASK_ALREADY_RUNNING: {
        level: "toast",
        message: "任务已在运行中",
    },

    /* ---------- project ---------- */

    PROJECT_NOT_FOUND: {
        level: "toast",
        message: "项目不存在",
    },

    /* ---------- fs ---------- */

    FS_ALREADY_EXISTS: {
        level: "toast",
        message: "文件或文件夹已存在",
    },
    FS_NOT_FOUND: {
        level: "toast",
        message: "文件或文件夹未找到",
    },
    /* ---------- system ---------- */
    INTERNAL_ERROR: {
        level: "toast",
        message: "系统异常，请稍后重试",
    },

    CONNECTION_LOST: {
        level: "banner",
        message: "与本地服务的连接已断开",
        action: { retry: true },
    },

    HTTP_ERROR: {
        level: "toast",
        message: "网络请求失败，请检查您的网络连接",
    },

    UNAUTHORIZED: {
        level: "banner",
        message: "未授权访问，请重新登录",
        action: { reload: true },
    },

    UNKNOWN_ERROR: {
        level: "toast",
        message: "发生未知错误，请稍后重试",
    },

    /* ---------- ws ---------- */

    WS_ERROR: {
        level: "banner",
        message: "WebSocket 连接异常",
        action: { retry: true },
    },

    WS_CLOSED: {
        level: "banner",
        message: "WebSocket 连接已关闭",
        action: { retry: true },
    },

    /* ---------- protocol / dev ---------- */

    INVALID_JSON: {
        level: "dev-only",
    },

    INVALID_MSG: {
        level: "dev-only",
    },
};
