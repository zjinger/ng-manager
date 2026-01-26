
export type ErrorCode =
    // Project
    | "PROJECT_NOT_FOUND"
    | "PROJECT_ROOT_INVALID"
    | "PROJECT_ALREADY_EXISTS"

    // Project Import
    | "PROJECT_IMPORT_NOT_EXISTS"
    | "PROJECT_IMPORT_NOT_DIR"
    | "PROJECT_IMPORT_ALREADY_REGISTERED"
    | "PROJECT_IMPORT_NOT_RECOGNIZED"
    | "PROJECT_IMPORT_SCAN_FAILED"

    // Project Creation
    | "INVALID_NAME"
    | "TARGET_EXISTS"
    | "INVALID_REPO_URL"
    | "INVALID_PARENT_DIR"

    // Project Analysis
    | "PROJECT_ANGULAR_JSON_INVALID"
    | "PROJECT_VITE_CONFIG_INVALID"

    // Config
    | "CONFIG_BACKUP_NOT_FOUND"
    | "CONFIG_READ_FAILED"
    | "CONFIG_WRITE_FAILED"
    // | "CONFIG_INVALID_JSON"
    // | "CONFIG_VALIDATION_FAILED"
    | "CONFIG_CONFLICT"
    | "CONFIG_OPEN_FAILED"
    | "CONFIG_SCHEMA_NOT_FOUND"
    | "CONFIG_DOMAIN_NOT_FOUND"
    | "CONFIG_DOC_NOT_FOUND"

    // Task / Process
    | "TASK_NOT_FOUND"
    | "RUN_NOT_FOUND"
    | "TASK_ID_REQUIRED"
    | "TASK_ALREADY_RUNNING"
    | "PROCESS_SPAWN_FAILED"
    | "TASK_SPEC_NOT_FOUND"
    | "TASK_NOT_RUNNABLE"
    // WS 
    | "BAD_JSON"
    | "BAD_MSG"
    | "OP_NOT_SUPPORTED"
    | "HANDLER_FAILED"
    | "TOPIC_NOT_FOUND"
    | "OP_NOT_FOUND"

    // FS
    | "FS_NOT_FOUND"
    | "FS_ALREADY_EXISTS"
    | "FS_PERMISSION_DENIED"
    | "FS_EXISTS_FAILED"

    // Editor
    | "EDITOR_NOT_FOUND"
    | "EDITOR_LAUNCH_FAILED"

    // Infra / Auth
    | "STORAGE_IO_ERROR"
    | "UNAUTHORIZED"
    | "INVALID_TIMESTAMP"

    // Deps
    | "DEP_INSTALL_FAILED"
    | "DEP_UNINSTALL_FAILED"
    | "DEP_NOT_FOUND"

    // Dashboard
    | "DASHBOARD_CONFLICT"
    | "WIDGET_NOT_FOUND"
    | "WIDGET_LOCKED"

    // Dashboard RSS
    | "RSS_FETCH_FAILED"
    | "INVALID_RSS_URL"

    // Fallback
    | "UNKNOWN_ERROR"
    // Generic
    | "BAD_REQUEST" // 通用的请求错误
    | "NOT_IMPLEMENTED" // 通用的未实现错误

export class AppError extends Error {
    constructor(
        public code: ErrorCode,
        message: string,
        public meta?: Record<string, any>
    ) {
        super(message);
        // fix:现在的 AppError 没有设置 this.name、也没修正原型链（在某些 TS 编译目标下可能怪异）
        this.name = "AppError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}