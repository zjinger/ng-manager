import { AppError } from '../app-error';
import { RuntimeErrorCodes, type RuntimeErrorCode } from '../sources/runtime.error-codes';

export class RuntimeError extends AppError<RuntimeErrorCode> {
  public readonly source = '@yinuo-ngm/runtime';
}

export const runtimeErrors = {
  lockFailed: (cause?: string) =>
    new RuntimeError(RuntimeErrorCodes.RUNTIME_LOCK_FAILED, cause ? `锁文件操作失败: ${cause}` : '锁文件操作失败', cause ? { cause } : undefined),

  serverNotStarted: () =>
    new RuntimeError(RuntimeErrorCodes.RUNTIME_SERVER_NOT_STARTED, '服务器未启动'),

  healthCheckFailed: (reason: string) =>
    new RuntimeError(RuntimeErrorCodes.RUNTIME_HEALTH_CHECK_FAILED, `健康检查失败: ${reason}`, { reason }),

  shutdownFailed: (reason: string) =>
    new RuntimeError(RuntimeErrorCodes.RUNTIME_SHUTDOWN_FAILED, `关闭失败: ${reason}`, { reason }),
} as const;
