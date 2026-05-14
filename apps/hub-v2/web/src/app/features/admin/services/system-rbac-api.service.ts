import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClientService } from '@core/http';
import type {
  SystemRoleEntity,
  SystemRoleWithCounts,
  SystemRoleDetail,
  SystemPermissionEntity,
  RoleUserEntity,
  UserSystemRoleEntity,
  CreateSystemRoleInput,
  UpdateSystemRoleInput,
  UpdateRolePermissionsInput,
  AddRoleUsersInput
} from '../models/system-rbac.model';

@Injectable({ providedIn: 'root' })
export class SystemRbacApiService {
  private readonly api = inject(ApiClientService);

  listRoles(query: { keyword?: string; status?: string } = {}) {
    return this.api.get<{ items: SystemRoleWithCounts[] }>('/system-roles', query)
      .pipe(map((response) => response.items));
  }

  getRoleDetail(roleId: string) {
    return this.api.get<SystemRoleDetail>(`/system-roles/${roleId}`);
  }

  createRole(input: CreateSystemRoleInput) {
    return this.api.post<SystemRoleEntity, CreateSystemRoleInput>('/system-roles', input);
  }

  updateRole(roleId: string, input: UpdateSystemRoleInput) {
    return this.api.patch<SystemRoleEntity, UpdateSystemRoleInput>(`/system-roles/${roleId}`, input);
  }

  deleteRole(roleId: string) {
    return this.api.delete<{ id: string }>(`/system-roles/${roleId}`);
  }

  listPermissions() {
    return this.api.get<{ items: SystemPermissionEntity[] }>('/system-permissions')
      .pipe(map((response) => response.items));
  }

  getRolePermissions(roleId: string) {
    return this.api.get<{ items: SystemPermissionEntity[] }>(`/system-roles/${roleId}/permissions`)
      .pipe(map((response) => response.items));
  }

  setRolePermissions(roleId: string, input: UpdateRolePermissionsInput) {
    return this.api.put<void, UpdateRolePermissionsInput>(`/system-roles/${roleId}/permissions`, input);
  }

  listRoleUsers(roleId: string) {
    return this.api.get<{ items: RoleUserEntity[] }>(`/system-roles/${roleId}/users`)
      .pipe(map((response) => response.items));
  }

  addRoleUsers(roleId: string, input: AddRoleUsersInput) {
    return this.api.post<void, AddRoleUsersInput>(`/system-roles/${roleId}/users`, input);
  }

  removeRoleUser(roleId: string, userId: string) {
    return this.api.delete<void>(`/system-roles/${roleId}/users/${userId}`);
  }

  listUserSystemRoles(userId: string) {
    return this.api.get<{ items: UserSystemRoleEntity[] }>(`/users/${userId}/system-roles`)
      .pipe(map((response) => response.items));
  }
}
