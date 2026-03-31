import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, throwError } from 'rxjs';

import { ApiError } from './api-error';

const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  PROJECT_INACTIVE: '项目已归档，仅支持查看',
};

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const message = inject(NzMessageService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const errorCode: string | undefined = error.error?.code;
        const rawMessage = error.error?.message || error.message || '请求失败';
        const friendlyMessage = (errorCode && FRIENDLY_ERROR_MESSAGES[errorCode]) || rawMessage;

        if (error.status >= 500) {
          message.error('服务暂时不可用');
        }

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
