import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import { hasRequiredPermissions, normalizePermissionList, type PermissionMatchMode } from './permission.utils';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const required = normalizePermissionList(route.data?.['permissions']);
  const mode = (route.data?.['permissionMode'] as PermissionMatchMode | undefined) ?? 'any';

  if (required.length === 0) {
    return true;
  }

  return authService.initialize().pipe(
    map((ok) => {
      if (!ok) {
        return router.createUrlTree(['/login']);
      }
      const granted = authStore.currentUser()?.permissionCodes ?? [];
      const pass = hasRequiredPermissions(granted, required, mode);
      return pass ? true : router.createUrlTree(['/dashboard']);
    })
  );
};
