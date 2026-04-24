import { AppError } from '../app-error';
import { ApiErrorCodes, type ApiErrorCode } from '../sources/api.error-codes';

export class ApiError extends AppError<ApiErrorCode> {
  public readonly source = '@yinuo-ngm/api';
}

export const apiErrors = {
  requestNotFound: (id: string) =>
    new ApiError(ApiErrorCodes.API_REQUEST_NOT_FOUND, `请求不存在: ${id}`, { requestId: id }),

  requestSaveFailed: (id: string, cause?: string) =>
    new ApiError(ApiErrorCodes.API_REQUEST_SAVE_FAILED, `请求保存失败: ${id}`, { requestId: id, cause }),

  collectionNotFound: (id: string) =>
    new ApiError(ApiErrorCodes.API_COLLECTION_NOT_FOUND, `集合不存在: ${id}`, { collectionId: id }),

  collectionAlreadyExists: (name: string) =>
    new ApiError(ApiErrorCodes.API_COLLECTION_ALREADY_EXISTS, `集合已存在: ${name}`, { name }),

  envNotFound: (id: string) =>
    new ApiError(ApiErrorCodes.API_ENV_NOT_FOUND, `环境不存在: ${id}`, { envId: id }),

  sendFailed: (reason: string, meta?: Record<string, unknown>) =>
    new ApiError(ApiErrorCodes.API_SEND_FAILED, `请求发送失败: ${reason}`, meta),

  timeout: (url: string, timeoutMs: number) =>
    new ApiError(ApiErrorCodes.API_TIMEOUT, `请求超时: ${url}`, { url, timeoutMs }),

  invalidUrl: (url: string) =>
    new ApiError(ApiErrorCodes.API_INVALID_URL, `URL 无效: ${url}`, { url }),

  hubTokenInvalid: () =>
    new ApiError(ApiErrorCodes.API_HUB_TOKEN_INVALID, 'Hub Token 无效'),

  hubTokenRequired: () =>
    new ApiError(ApiErrorCodes.API_HUB_TOKEN_REQUIRED, 'Hub Token 必填'),

  historyNotFound: (id: string) =>
    new ApiError(ApiErrorCodes.API_HISTORY_NOT_FOUND, `历史记录不存在: ${id}`, { historyId: id }),
} as const;
