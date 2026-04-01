import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, throwError } from 'rxjs';

import { ApiError } from './api-error';
import { resolveApiErrorMessage } from './api-error-messages';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const message = inject(NzMessageService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const errorCode: string | undefined = error.error?.code;
        const rawMessage = error.error?.message || error.message || '请求失败';
        const friendlyMessage = resolveApiErrorMessage(errorCode, rawMessage);
        if (error.status >= 400 && error.status < 500) {
          message.error(friendlyMessage);
        }
        if (error.status >= 500) {
          message.error(resolveApiErrorMessage('INTERNAL_ERROR', '服务暂时不可用'));
        }
        console.error('API Error:', {
          url: request.url,
          method: request.method,
          status: error.status,
          code: errorCode,
          message: rawMessage,
        });
        return throwError(
          () =>
            new ApiError(
              friendlyMessage,
              error.status,
              errorCode
            )
        );
      }

      return throwError(() => error);
    })
  );
};
