import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { ApiClientService } from '@core/http';
import type {
  AddRoleUsersInput,
  SystemPermissionEntity,
  SystemRoleEntity,
  UserSystemRoleEntity,
} from '../../admin/models/system-rbac.model';

@Injectable({ providedIn: 'root' })
export class UserRbacApiService {
  private readonly api = inject(ApiClientService);

  listRoles(query: { keyword?: string; status?: string } = {}) {
    return this.api.get<{ items: SystemRoleEntity[] }>('/system-roles', query).pipe(map((response) => response.items));
  }

  listUserSystemRoles(userId: string) {
    return this.api.get<{ items: UserSystemRoleEntity[] }>(`/users/${userId}/system-roles`).pipe(map((response) => response.items));
  }

  getRolePermissions(roleId: string) {
    return this.api
      .get<{ items: SystemPermissionEntity[] }>(`/system-roles/${roleId}/permissions`)
      .pipe(map((response) => response.items));
  }

  addRoleUsers(roleId: string, input: AddRoleUsersInput) {
    return this.api.post<void, AddRoleUsersInput>(`/system-roles/${roleId}/users`, input);
  }

  removeRoleUser(roleId: string, userId: string) {
    return this.api.delete<void>(`/system-roles/${roleId}/users/${userId}`);
  }
}
