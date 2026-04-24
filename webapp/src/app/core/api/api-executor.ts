import { GlobalErrorCodes } from '@yinuo-ngm/errors';
import { map } from 'rxjs';
import { coerceErrorPolicyCode } from '../error';
import { ApiBizError } from './api-biz-error';
import type { ApiError, ApiSuccess } from './api.types';

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function unwrapApi<T>() {
  return map((res: ApiSuccess<T> | ApiError) => {
    if (isObjectLike(res) && res.ok === true) {
      return res.data;
    }

    if (isObjectLike(res) && res.ok === false && isObjectLike(res.error)) {
      const code = coerceErrorPolicyCode(res.error.code) ?? GlobalErrorCodes.UNKNOWN_ERROR;
      const message = typeof res.error.message === 'string' ? res.error.message : '请求失败';
      const details = res.error.details;
      const requestId =
        isObjectLike(res.meta) && typeof res.meta.requestId === 'string' ? res.meta.requestId : undefined;
      throw new ApiBizError(code, message, details, requestId);
    }

    throw new ApiBizError(GlobalErrorCodes.UNKNOWN_ERROR, '接口响应格式不正确', res);
  });
}
