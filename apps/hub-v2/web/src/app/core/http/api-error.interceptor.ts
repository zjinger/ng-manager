import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, throwError } from 'rxjs';

import { ApiError } from './api-error';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const message = inject(NzMessageService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status >= 500) {
          message.error('服务暂时不可用');
        }

        return throwError(
          () =>
            new ApiError(
              error.error?.message || error.message || '请求失败',
              error.status,
              error.error?.code
            )
        );
      }

      return throwError(() => error);
    })
  );
};
