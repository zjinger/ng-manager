import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ErrorReportService } from './error-report.service';

export const clientErrorReportInterceptor: HttpInterceptorFn = (request, next) => {
  const reporter = inject(ErrorReportService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && shouldReportHttpError(error.status) && !reporter.isReportEndpoint(request.url)) {
        reporter.report({
          type: 'http',
          message: error.message || `HTTP ${error.status}`,
          error,
          requestMethod: request.method,
          requestUrl: request.urlWithParams,
          statusCode: error.status,
          extra: {
            statusText: error.statusText,
          },
        });
      }

      return throwError(() => error);
    })
  );
};

function shouldReportHttpError(status: number): boolean {
  return status === 0 || status >= 500;
}
