import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AdminAuthService } from '../services/admin-auth.service';

function shouldRedirect(error: HttpErrorResponse, currentUrl: string): boolean {
  if (error.status !== 401) {
    return false;
  }

  if (!error.url || !error.url.includes('/api/admin/')) {
    return false;
  }

  if (error.url.includes('/api/admin/auth/login')) {
    return false;
  }

  return !currentUrl.startsWith('/login');
}

export const authRedirectInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AdminAuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && shouldRedirect(error, router.url)) {
        auth.clearSession();
        void router.navigate(['/login'], {
          queryParams: {
            returnUrl: router.url || '/dashboard'
          }
        });
      }

      return throwError(() => error);
    })
  );
};