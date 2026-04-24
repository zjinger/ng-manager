/**
 * Runtime 错误码 (31XXX)
 *
 * | 码值   | 常量名                        | 说明                   | HTTP Status |
 * |--------|------------------------------|------------------------|-------------|
 * | 31001  | RUNTIME_LOCK_FAILED          | 锁文件操作失败         | 500         |
 * | 31002  | RUNTIME_SERVER_NOT_STARTED   | 服务器未启动            | 500         |
 * | 31003  | RUNTIME_HEALTH_CHECK_FAILED  | 健康检查失败            | 500         |
 * | 31004  | RUNTIME_SHUTDOWN_FAILED     | 关闭失败                | 500         |
 */
export const RuntimeErrorCodes = {
  RUNTIME_LOCK_FAILED: 31001,
  RUNTIME_SERVER_NOT_STARTED: 31002,
  RUNTIME_HEALTH_CHECK_FAILED: 31003,
  RUNTIME_SHUTDOWN_FAILED: 31004,
} as const;

export type RuntimeErrorCode = typeof RuntimeErrorCodes[keyof typeof RuntimeErrorCodes];
