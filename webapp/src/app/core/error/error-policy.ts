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
    COMMAND_NOT_FOUND = "COMMAND_NOT_FOUND",

    /* ---------- project ---------- */
    PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND",
    PROJECT_ROOT_INVALID = "PROJECT_ROOT_INVALID",
    PROJECT_ALREADY_EXISTS = "PROJECT_ALREADY_EXISTS",

    /** project creation */
    INVALID_NAME = "INVALID_NAME",
    TARGET_EXISTS = "TARGET_EXISTS",
    INVALID_REPO_URL = "INVALID_REPO_URL",
    GIT_CHECKOUT_FAILED = "GIT_CHECKOUT_FAILED",  // Git 检出失败
    BOOTSTRAP_NOT_IN_PICK_STATE = "BOOTSTRAP_NOT_IN_PICK_STATE", // 当前不处于选择根目录状态
    BOOTSTRAP_CTX_NOT_FOUND = "BOOTSTRAP_CTX_NOT_FOUND", // 引导上下文未找到
    BOOTSTRAP_INVALID_PICKED_ROOT = "BOOTSTRAP_INVALID_PICKED_ROOT", // 选择的根目录无效
    BOOTSTRAP_NOT_WAITING_PICK = "BOOTSTRAP_NOT_WAITING_PICK", // 引导未处于等待选择状态


    /** project analysis */
    PROJECT_ANGULAR_JSON_INVALID = "PROJECT_ANGULAR_JSON_INVALID",
    PROJECT_ANGULAR_JSON_NOT_FOUND = "PROJECT_ANGULAR_JSON_NOT_FOUND",
    PROJECT_VITE_CONFIG_INVALID = "PROJECT_VITE_CONFIG_INVALID",
    PROJECT_VUE_CONFIG_NOT_FOUND = "PROJECT_VUE_CONFIG_NOT_FOUND",

    /** config */
    CONFIG_BACKUP_NOT_FOUND = "CONFIG_BACKUP_NOT_FOUND",
    CONFIG_READ_FAILED = "CONFIG_READ_FAILED",
    CONFIG_CONFLICT = "CONFIG_CONFLICT",


    /* ---------- fs ---------- */
    FS_ALREADY_EXISTS = "FS_ALREADY_EXISTS",
    FS_PATH_NOT_FOUND = "FS_PATH_NOT_FOUND",
    FS_PERMISSION_DENIED = "FS_PERMISSION_DENIED",
    FS_EXISTS_FAILED = "FS_EXISTS_FAILED",
    FS_INVALID_NAME = "FS_INVALID_NAME",
    FS_MKDIR_FAILED = "FS_MKDIR_FAILED",

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

    /* ---------- deps ---------- */
    DEP_INSTALL_FAILED = "DEP_INSTALL_FAILED",
    DEP_UNINSTALL_FAILED = "DEP_UNINSTALL_FAILED",
    DEP_NOT_FOUND = "DEP_NOT_FOUND",

    /* ---------- dashboard ---------- */
    DASHBOARD_CONFLICT = "DASHBOARD_CONFLICT",
    WIDGET_NOT_FOUND = "WIDGET_NOT_FOUND",
    WIDGET_LOCKED = "WIDGET_LOCKED",

    /* ---------- Port Killer ---------- */
    KILL_PORT_FAILED = "KILL_PORT_FAILED",
    INVALID_PORT = "INVALID_PORT",

    /* ---------- dashboard rss---------- */
    RSS_FETCH_FAILED = "RSS_FETCH_FAILED",
    INVALID_RSS_URL = "INVALID_RSS_URL",

    /* ---------- API client---------- */
    COLLECTION_NOT_EMPTY = "COLLECTION_NOT_EMPTY", // 409 - collection has child collections/requests
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

    COMMAND_NOT_FOUND: {
        level: "toast",
        message: "命令未找到，请确保已正确安装所需软件",
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

    /** project creation */
    INVALID_NAME: {
        level: "toast",
        message: "无效的项目名称",
    },
    TARGET_EXISTS: {
        level: "toast",
        message: "目标路径已存在",
    },
    INVALID_REPO_URL: {
        level: "toast",
        message: "无效的仓库地址",
    },
    GIT_CHECKOUT_FAILED: {
        level: "toast",
        message: "Git 检出失败",
    },

    BOOTSTRAP_NOT_IN_PICK_STATE: {
        level: "toast",
        message: "当前不处于选择根目录状态",
    },
    BOOTSTRAP_CTX_NOT_FOUND: {
        level: "toast",
        message: "引导上下文未找到",
    },
    BOOTSTRAP_INVALID_PICKED_ROOT: {
        level: "toast",
        message: "选择的根目录无效",
    },
    BOOTSTRAP_NOT_WAITING_PICK: {
        level: "toast",
        message: "引导未处于等待选择状态",
    },

    /** project analysis */
    PROJECT_ANGULAR_JSON_INVALID: {
        level: "toast",
        message: "angular.json 无效",
    },
    PROJECT_ANGULAR_JSON_NOT_FOUND: {
        level: "toast",
        message: "angular.json 未找到",
    },
    PROJECT_VITE_CONFIG_INVALID: {
        level: "toast",
        message: "vite 配置无效",
    },
    PROJECT_VUE_CONFIG_NOT_FOUND: {
        level: "toast",
        message: "vite 配置未找到",
    },

    /** config */
    CONFIG_BACKUP_NOT_FOUND: {
        level: "toast",
        message: "配置备份未找到",
    },

    CONFIG_READ_FAILED: {
        level: "toast",
        message: "配置读取失败，文件可能已损坏",
    },

    CONFIG_CONFLICT: {
        level: "toast",
        message: "配置已被其他地方修改，请刷新重试",
    },

    /* ---------- fs ---------- */

    FS_ALREADY_EXISTS: {
        level: "toast",
        message: "文件或文件夹已存在",
    },
    FS_PATH_NOT_FOUND: {
        level: "toast",
        message: "文件或文件夹未找到",
    },
    FS_PERMISSION_DENIED: {
        level: "toast",
        message: "文件系统权限被拒绝",
    },
    FS_EXISTS_FAILED: {
        level: "toast",
        message: "检查路径是否存在时出错",
    },
    FS_INVALID_NAME: {
        level: "toast",
        message: "无效的文件或文件夹名称",
    },
    FS_MKDIR_FAILED: {
        level: "toast",
        message: "创建文件夹失败",
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

    /* ---------- deps ---------- */
    DEP_INSTALL_FAILED: {
        level: "toast",
        message: "依赖安装失败",
    },
    DEP_UNINSTALL_FAILED: {
        level: "toast",
        message: "依赖卸载失败",
    },
    DEP_NOT_FOUND: {
        level: "toast",
        message: "依赖未找到",
    },

    /* ---------- dashboard ---------- */
    DASHBOARD_CONFLICT: {
        level: "toast",
        message: "仪表盘已被其他地方修改，请刷新重试",
    },
    WIDGET_NOT_FOUND: {
        level: "toast",
        message: "部件未找到",
    },
    WIDGET_LOCKED: {
        level: "toast",
        message: "部件被锁定，无法修改",
    },

    /* ---------- dashboard rss ---------- */
    RSS_FETCH_FAILED: {
        level: "toast",
        message: "RSS 源获取失败",
    },
    INVALID_RSS_URL: {
        level: "toast",
        message: "无效的 RSS 源地址",
    },

    /* ---------- port killer ---------- */
    KILL_PORT_FAILED: {
        level: "toast",
        message: "端口释放失败",
    },
    INVALID_PORT: {
        level: "toast",
        message: "无效的端口号",
    },

    /* ---------- api client ---------- */
    COLLECTION_NOT_EMPTY: {
        level: "toast",
        message: "集合不为空，无法删除",
    },

    /* ---------- protocol / dev ---------- */

    INVALID_JSON: {
        level: "dev-only",
    },

    INVALID_MSG: {
        level: "dev-only",
    },
};
