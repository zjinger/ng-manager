import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { GlobalErrorCodes } from '@yinuo-ngm/errors';
import { catchError, throwError } from 'rxjs';
import { ErrorDispatcher, FRONTEND_ERROR_CODES, coerceErrorPolicyCode } from '../error';
import { ApiBizError } from '../api/api-biz-error';
import { APP_CONFIG } from '@env/environment';
import * as _ from 'lodash';

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractHttpErrorCode(err: HttpErrorResponse) {
  if (isObjectLike(err.error)) {
    const nestedRaw = err.error['error'];
    const nestedError = isObjectLike(nestedRaw) ? nestedRaw : undefined;
    const directCode = coerceErrorPolicyCode(err.error['code']);
    if (directCode !== undefined) {
      return directCode;
    }
    const nestedCode = coerceErrorPolicyCode(nestedError?.['code']);
    if (nestedCode !== undefined) {
      return nestedCode;
    }
  }

  if (err.status === 0) {
    return FRONTEND_ERROR_CODES.HTTP_ERROR;
  }

  if (err.status === 401) {
    return GlobalErrorCodes.UNAUTHORIZED;
  }

  return GlobalErrorCodes.INTERNAL_ERROR;
}

function extractHttpErrorMessage(err: HttpErrorResponse): string {
  if (isObjectLike(err.error)) {
    const nestedRaw = err.error['error'];
    const nestedError = isObjectLike(nestedRaw) ? nestedRaw : undefined;
    const nestedMessage = nestedError?.['message'];
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage;
    }
    const errorMessage = err.error['message'];
    if (typeof errorMessage === 'string' && errorMessage.trim()) {
      return errorMessage;
    }
  }

  if (typeof err.message === 'string' && err.message.trim()) {
    return err.message;
  }

  return '请求失败';
}

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const dispatcher = inject(ErrorDispatcher);

  // 注入 requestId
  const requestId = _.uniqueId('req-');
  req = req.clone({
    setHeaders: { 'X-Request-Id': requestId },
  });

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!APP_CONFIG.production) {
        console.error(`[HTTP][${requestId}] Error:`, err);
      }

      if (err instanceof ApiBizError) {
        dispatcher.dispatch(err.code, err.message, err.details);
        return throwError(() => err);
      }

      if (err instanceof HttpErrorResponse) {
        const code = extractHttpErrorCode(err);
        const message = extractHttpErrorMessage(err);
        dispatcher.dispatch(code, message, err.error);
        return throwError(() => err);
      }

      const unknownMessage = err instanceof Error ? err.message : '未知错误';
      dispatcher.dispatch(GlobalErrorCodes.INTERNAL_ERROR, unknownMessage, err);
      return throwError(() => err);
    }),
  );
};
