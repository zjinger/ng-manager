import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminAuthGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);

  if (auth.profile() !== null) {
    return true;
  }

  const profile = await auth.ensureSession();
  if (profile !== null) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

export const loginPageGuard: CanActivateFn = async () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);

  if (auth.profile() !== null) {
    return router.createUrlTree(['/dashboard']);
  }

  const profile = await auth.ensureSession();
  if (profile !== null) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};