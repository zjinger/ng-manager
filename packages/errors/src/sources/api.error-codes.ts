/**
 * API Client 错误码 (21XXX)
 *
 * | 码值   | 常量名                        | 说明                   | HTTP Status |
 * |--------|------------------------------|------------------------|-------------|
 * | 21001  | API_REQUEST_NOT_FOUND        | 请求不存在              | 404         |
 * | 21002  | API_REQUEST_SAVE_FAILED     | 请求保存失败            | 500         |
 * | 21003  | API_COLLECTION_NOT_FOUND    | 集合不存在              | 404         |
 * | 21004  | API_COLLECTION_ALREADY_EXISTS | 集合已存在            | 409         |
 * | 21005  | API_ENV_NOT_FOUND           | 环境不存在              | 404         |
 * | 21006  | API_SEND_FAILED             | 请求发送失败            | 500         |
 * | 21007  | API_TIMEOUT                 | 请求超时                | 504         |
 * | 21008  | API_INVALID_URL             | URL 无效                | 400         |
 * | 21009  | API_HUB_TOKEN_INVALID       | Hub Token 无效          | 401         |
 * | 21010  | API_HUB_TOKEN_REQUIRED      | Hub Token 必填         | 400         |
 * | 21011  | API_HISTORY_NOT_FOUND       | 历史记录不存在         | 404         |
 * | 21012  | API_PROJECT_ID_REQUIRED     | projectId 必填         | 400         |
 * | 21013  | API_REQUEST_ID_REQUIRED     | request.id 必填       | 400         |
 * | 21014  | API_COLLECTION_NOT_EMPTY    | 集合不为空             | 409         |
 */
export const ApiErrorCodes = {
  API_REQUEST_NOT_FOUND: 21001,
  API_REQUEST_SAVE_FAILED: 21002,
  API_COLLECTION_NOT_FOUND: 21003,
  API_COLLECTION_ALREADY_EXISTS: 21004,
  API_ENV_NOT_FOUND: 21005,
  API_SEND_FAILED: 21006,
  API_TIMEOUT: 21007,
  API_INVALID_URL: 21008,
  API_HUB_TOKEN_INVALID: 21009,
  API_HUB_TOKEN_REQUIRED: 21010,
  API_HISTORY_NOT_FOUND: 21011,
  API_PROJECT_ID_REQUIRED: 21012,
  API_REQUEST_ID_REQUIRED: 21013,
  API_COLLECTION_NOT_EMPTY: 21014,
} as const;

export type ApiErrorCode = typeof ApiErrorCodes[keyof typeof ApiErrorCodes];
