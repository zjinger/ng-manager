import { inject, Injectable } from '@angular/core';
import { forkJoin, map, of, switchMap } from 'rxjs';

import { UserRbacApiService } from './user-rbac-api.service';

@Injectable({ providedIn: 'root' })
export class UserRoleSyncService {
  private readonly api = inject(UserRbacApiService);

  syncUserRoles(userId: string, targetRoleIds: string[]) {
    return this.api.listUserSystemRoles(userId).pipe(
      switchMap((currentRoles) => {
        const currentIds = new Set(currentRoles.map((item) => item.roleId));
        const targetIds = new Set(targetRoleIds);

        const addRequests = [...targetIds]
          .filter((roleId) => !currentIds.has(roleId))
          .map((roleId) => this.api.addRoleUsers(roleId, { userIds: [userId] }));

        const removeRequests = currentRoles
          .filter((item) => !targetIds.has(item.roleId))
          .map((item) => this.api.removeRoleUser(item.roleId, userId));

        const requests = [...addRequests, ...removeRequests];
        if (requests.length === 0) {
          return of(void 0);
        }
        return forkJoin(requests).pipe(map(() => void 0));
      }),
    );
  }
}
