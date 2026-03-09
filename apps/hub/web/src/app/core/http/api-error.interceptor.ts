import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import type { ApiErrorResponse } from './api.types';

export class HubApiError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'HubApiError';
  }
}

function toApiError(error: HttpErrorResponse): HubApiError | null {
  const payload = error.error as Partial<ApiErrorResponse> | null;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (typeof payload.code !== 'string' || typeof payload.message !== 'string') {
    return null;
  }

  return new HubApiError(payload.code, payload.message, error.status, payload.details);
}

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const apiError = toApiError(error);
        if (apiError) {
          return throwError(() => apiError);
        }
      }

      return throwError(() => error);
    })
  );
};