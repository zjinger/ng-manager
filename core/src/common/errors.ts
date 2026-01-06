export type ErrorCode =
    | "PROJECT_NOT_FOUND"
    | "PROJECT_ROOT_INVALID"
    | "PROJECT_ALREADY_EXISTS"

    // import / detect
    | "PROJECT_IMPORT_NOT_DIR"
    | "PROJECT_IMPORT_NOT_EXISTS"
    | "PROJECT_IMPORT_ALREADY_REGISTERED"
    | "PROJECT_IMPORT_NOT_RECOGNIZED"
    | "PROJECT_IMPORT_SCAN_FAILED"

    // fs
    | "FS_ALREADY_EXISTS"
    | "FS_NOT_FOUND"


    // task / process
    | "TASK_ALREADY_RUNNING"
    | "TASK_NOT_FOUND"
    | "PROCESS_SPAWN_FAILED"
    | "STORAGE_IO_ERROR"

    // generic
    | "UNAUTHORIZED"
    | "UNKNOWN_ERROR";

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