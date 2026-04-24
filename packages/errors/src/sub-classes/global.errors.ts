import { AppError } from '../app-error';
import { GlobalErrorCodes, type GlobalErrorCode } from '../sources/global.error-codes';

export class GlobalError extends AppError<GlobalErrorCode> {
  public readonly source = '@yinuo-ngm/errors';
}

export const globalErrors = {
  unknown: (meta?: Record<string, unknown>) =>
    new GlobalError(GlobalErrorCodes.UNKNOWN_ERROR, '未知错误', meta),

  internal: (meta?: Record<string, unknown>) =>
    new GlobalError(GlobalErrorCodes.INTERNAL_ERROR, '内部错误', meta),

  badRequest: (reason?: string, meta?: Record<string, unknown>) =>
    new GlobalError(GlobalErrorCodes.BAD_REQUEST, reason ?? '请求错误', meta),

  notFound: (resource?: string, meta?: Record<string, unknown>) =>
    new GlobalError(GlobalErrorCodes.NOT_FOUND, resource ? `${resource} 不存在` : '未找到', meta),

  notImplemented: (feature?: string) =>
    new GlobalError(GlobalErrorCodes.NOT_IMPLEMENTED, feature ? `${feature} 未实现` : '功能未实现'),

  storageIo: (detail?: string, meta?: Record<string, unknown>) =>
    new GlobalError(GlobalErrorCodes.STORAGE_IO_ERROR, detail ? `存储 IO 错误: ${detail}` : '存储 IO 错误', meta),

  pathNotFound: (path: string) =>
    new GlobalError(GlobalErrorCodes.FS_PATH_NOT_FOUND, `路径不存在: ${path}`, { path }),

  permissionDenied: (path?: string) =>
    new GlobalError(GlobalErrorCodes.FS_PERMISSION_DENIED, path ? `权限不足: ${path}` : '权限不足', path ? { path } : undefined),

  alreadyExists: (resource: string) =>
    new GlobalError(GlobalErrorCodes.FS_ALREADY_EXISTS, `${resource} 已存在`),

  invalidName: (name: string, reason?: string) =>
    new GlobalError(GlobalErrorCodes.FS_INVALID_NAME, reason ? `无效名称: ${reason}` : '文件名无效', name ? { name } : undefined),
} as const;
