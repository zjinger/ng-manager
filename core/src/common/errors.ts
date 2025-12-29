export type ErrorCode =
    | "PROJECT_NOT_FOUND"
    | "PROJECT_ROOT_INVALID"
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
    }
}