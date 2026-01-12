import type { ErrorLevel, ErrorAction } from "./error.types";

export const enum ErrorPolicyCode {
    /* ---------- task ---------- */
    TASK_NOT_FOUND = "TASK_NOT_FOUND",
    TASK_ALREADY_RUNNING = "TASK_ALREADY_RUNNING",
    PROCESS_SPAWN_FAILED = "PROCESS_SPAWN_FAILED",
    TASK_SPEC_NOT_FOUND = "TASK_SPEC_NOT_FOUND",
    TASK_NOT_RUNNABLE = "TASK_NOT_RUNNABLE",
    RUN_NOT_FOUND = "RUN_NOT_FOUND",
    TASK_ID_REQUIRED = "TASK_ID_REQUIRED",

    /* ---------- project ---------- */
    PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND",
    PROJECT_ROOT_INVALID = "PROJECT_ROOT_INVALID",
    PROJECT_ALREADY_EXISTS = "PROJECT_ALREADY_EXISTS",

    /* ---------- fs ---------- */
    FS_ALREADY_EXISTS = "FS_ALREADY_EXISTS",
    FS_NOT_FOUND = "FS_NOT_FOUND",
    FS_PERMISSION_DENIED = "FS_PERMISSION_DENIED",

    /* ---------- system ---------- */
    INTERNAL_ERROR = "INTERNAL_ERROR",
    CONNECTION_LOST = "CONNECTION_LOST",
    HTTP_ERROR = "HTTP_ERROR",
    UNAUTHORIZED = "UNAUTHORIZED",
    UNKNOWN_ERROR = "UNKNOWN_ERROR",

    /* ---------- ws ---------- */
    WS_ERROR = "WS_ERROR",
    WS_CLOSED = "WS_CLOSED",
    BAD_JSON = "BAD_JSON",
    BAD_MSG = "BAD_MSG",
    OP_NOT_SUPPORTED = "OP_NOT_SUPPORTED",
    HANDLER_FAILED = "HANDLER_FAILED",
    TOPIC_NOT_FOUND = "TOPIC_NOT_FOUND",
    OP_NOT_FOUND = "OP_NOT_FOUND",

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
    PROCESS_SPAWN_FAILED: {
        level: "toast",
        message: "任务启动失败",
    },
    TASK_SPEC_NOT_FOUND: {
        level: "toast",
        message: "任务规格未找到",
    },
    TASK_NOT_RUNNABLE: {
        level: "toast",
        message: "任务不可运行",
    },
    RUN_NOT_FOUND: {
        level: "toast",
        message: "运行实例未找到",
    },
    TASK_ID_REQUIRED: {
        level: "toast",
        message: "任务 ID 为必填项",
    },

    /* ---------- project ---------- */

    PROJECT_NOT_FOUND: {
        level: "toast",
        message: "项目不存在",
    },
    PROJECT_ROOT_INVALID: {
        level: "toast",
        message: "项目根目录无效",
    },
    PROJECT_ALREADY_EXISTS: {
        level: "toast",
        message: "项目已存在",
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
    FS_PERMISSION_DENIED: {
        level: "toast",
        message: "文件系统权限被拒绝",
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
    BAD_JSON: {
        level: "toast",
        message: "收到无效的 JSON 数据",
    },
    BAD_MSG: {
        level: "toast",
        message: "收到无效的消息格式",
    },
    OP_NOT_SUPPORTED: {
        level: "toast",
        message: "操作不被支持",
    },
    HANDLER_FAILED: {
        level: "toast",
        message: "消息处理失败",
    },
    TOPIC_NOT_FOUND: {
        level: "toast",
        message: "未知的消息主题",
    },
    OP_NOT_FOUND: {
        level: "toast",
        message: "未知的操作类型",
    },

    /* ---------- protocol / dev ---------- */

    INVALID_JSON: {
        level: "dev-only",
    },

    INVALID_MSG: {
        level: "dev-only",
    },
};
