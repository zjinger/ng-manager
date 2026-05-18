import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import { hasRequiredPermissions } from './permission.utils';

const ADMIN_CONSOLE_PERMISSIONS = [
  'admin.dashboard.view',
  'admin.users.manage',
  'admin.departments.manage',
  'admin.roles.manage',
  'admin.audit.view',
  'admin.settings.manage',
];

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return authService.initialize().pipe(
    map((ok) => {
      if (!ok) {
        return router.createUrlTree(['/login']);
      }
      const granted = authStore.currentUser()?.permissionCodes ?? [];
      return hasRequiredPermissions(granted, ADMIN_CONSOLE_PERMISSIONS, 'any')
        ? true
        : router.createUrlTree(['/dashboard']);
    })
  );
};
