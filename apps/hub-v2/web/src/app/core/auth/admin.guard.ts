import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return authService.initialize().pipe(
    map((ok) => {
      if (!ok) {
        return router.createUrlTree(['/login']);
      }
      return authStore.currentUser()?.role === 'admin' ? true : router.createUrlTree(['/dashboard']);
    })
  );
};
