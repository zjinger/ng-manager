import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MigrationService } from './migration.service';

export const migrationGuard: CanActivateFn = (route, state) => {
  const migrationService = inject(MigrationService);
  const router = inject(Router);

  if (!migrationService.enabled || !migrationService.config.forceRedirect) {
    return true;
  }

  const currentPath = state.url || '/';
  const mappedPath = mapLegacyPathToV2(currentPath);

  migrationService.replaceToV2(mappedPath);
  return false;
};

function mapLegacyPathToV2(legacyPath: string): string {
  if (legacyPath.startsWith('/projects')) {
    return '/projects';
  }

  if (legacyPath.startsWith('/issues')) {
    return '/issues';
  }

  if (legacyPath.startsWith('/docs')) {
    return '/docs';
  }

  if (legacyPath.startsWith('/announcements')) {
    return '/announcements';
  }

  if (legacyPath.startsWith('/dashboard')) {
    return '/dashboard';
  }

  return '/';
}