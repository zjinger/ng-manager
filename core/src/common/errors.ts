
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

    // Task / Process
    | "TASK_NOT_FOUND"
    | "RUN_NOT_FOUND"
    | "TASK_ALREADY_RUNNING"
    | "PROCESS_SPAWN_FAILED"
    | "TASK_SPEC_NOT_FOUND"
    | "TASK_NOT_RUNNABLE"

    // FS
    | "FS_NOT_FOUND"
    | "FS_ALREADY_EXISTS"
    | "FS_PERMISSION_DENIED"

    // Editor
    | "EDITOR_NOT_FOUND"
    | "EDITOR_LAUNCH_FAILED"

    // Infra / Auth
    | "STORAGE_IO_ERROR"
    | "UNAUTHORIZED"
    | "INVALID_TIMESTAMP"

    // Fallback
    | "UNKNOWN_ERROR"
    // Generic
    | "BAD_REQUEST" // 通用的请求错误

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