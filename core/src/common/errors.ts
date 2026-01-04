export type ErrorCode =
    | "PROJECT_NOT_FOUND"
    | "PROJECT_ROOT_INVALID"
    | "PROJECT_ALREADY_EXISTS"
    | "TASK_ALREADY_RUNNING"
    | "TASK_NOT_FOUND"
    | "PROCESS_SPAWN_FAILED"
    | "STORAGE_IO_ERROR";

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