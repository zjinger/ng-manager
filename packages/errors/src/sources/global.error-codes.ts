/**
 * 全局错误码 (1XXXX)
 * 所有业务包共享，禁止重复定义同义码
 *
 * | 码值   | 常量名                 | 说明                   | HTTP Status |
 * |--------|----------------------|------------------------|-------------|
 * | 10001  | UNKNOWN_ERROR        | 未知错误               | 500         |
 * | 10002  | INTERNAL_ERROR       | 内部错误               | 500         |
 * | 10003  | BAD_REQUEST          | 通用请求错误           | 400         |
 * | 10004  | NOT_FOUND            | 通用未找到             | 404         |
 * | 10005  | NOT_IMPLEMENTED      | 功能未实现             | 501         |
 * | 10101  | STORAGE_IO_ERROR     | 存储 IO 错误           | 500         |
 * | 10102  | FS_PATH_NOT_FOUND    | 文件路径不存在         | 404         |
 * | 10103  | FS_PERMISSION_DENIED | 权限不足               | 403         |
 * | 10104  | FS_ALREADY_EXISTS    | 文件已存在             | 409         |
 * | 10105  | FS_INVALID_NAME      | 文件名无效             | 400         |
 * | 10106  | FS_MKDIR_FAILED      | 目录创建失败           | 500         |
 * | 10301  | BAD_JSON             | JSON 解析失败          | 400         |
 * | 10302  | BAD_MSG              | WebSocket 消息格式错误  | 400         |
 * | 10303  | OP_NOT_SUPPORTED     | 操作不支持             | 400         |
 * | 10304  | TOPIC_NOT_FOUND      | Topic 不存在           | 404         |
 * | 10305  | HANDLER_FAILED       | 处理器执行失败         | 500         |
 * | 10306  | OP_NOT_FOUND         | 操作不存在             | 400         |
 * | 10401  | UNAUTHORIZED         | 未授权                 | 401         |
 * | 10402  | INVALID_TIMESTAMP     | 时间戳无效             | 400         |
 */
export const GlobalErrorCodes = {
  UNKNOWN_ERROR: 10001,
  INTERNAL_ERROR: 10002,
  BAD_REQUEST: 10003,
  NOT_FOUND: 10004,
  NOT_IMPLEMENTED: 10005,
  STORAGE_IO_ERROR: 10101,
  FS_PATH_NOT_FOUND: 10102,
  FS_PERMISSION_DENIED: 10103,
  FS_ALREADY_EXISTS: 10104,
  FS_INVALID_NAME: 10105,
  FS_MKDIR_FAILED: 10106,
  BAD_JSON: 10301,
  BAD_MSG: 10302,
  OP_NOT_SUPPORTED: 10303,
  TOPIC_NOT_FOUND: 10304,
  HANDLER_FAILED: 10305,
  OP_NOT_FOUND: 10306,
  UNAUTHORIZED: 10401,
  INVALID_TIMESTAMP: 10402,
} as const;

export type GlobalErrorCode = typeof GlobalErrorCodes[keyof typeof GlobalErrorCodes];
