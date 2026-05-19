import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { ApiClientService } from '@core/http';
import type {
  CreateDepartmentInput,
  CreateFinanceRoleInput,
  DepartmentEntity,
  DepartmentTitleEntity,
  DepartmentTitleInput,
  DepartmentTreeNode,
  FinanceRoleEntity,
  UpdateDepartmentInput,
  UpdateFinanceRoleInput,
  UserDepartmentEntity,
  UserDepartmentInput,
} from '../models/organization.model';

@Injectable({ providedIn: 'root' })
export class OrganizationApiService {
  private readonly api = inject(ApiClientService);

  listDepartments(query: { keyword?: string; status?: string } = {}) {
    return this.api
      .get<{ items: DepartmentEntity[] }>('/departments', query)
      .pipe(map((response) => response.items));
  }

  listDepartmentTree(query: { keyword?: string; status?: string } = {}) {
    return this.api
      .get<{ items: DepartmentTreeNode[] }>('/departments/tree', query)
      .pipe(map((response) => response.items));
  }

  createDepartment(input: CreateDepartmentInput) {
    return this.api.post<DepartmentEntity, CreateDepartmentInput>('/departments', input);
  }

  updateDepartment(departmentId: string, input: UpdateDepartmentInput) {
    return this.api.patch<DepartmentEntity, UpdateDepartmentInput>(
      `/departments/${departmentId}`,
      input,
    );
  }

  listDepartmentTitles(departmentId: string) {
    return this.api
      .get<{ items: DepartmentTitleEntity[] }>(`/departments/${departmentId}/titles`)
      .pipe(map((response) => response.items));
  }

  addDepartmentTitle(departmentId: string, input: DepartmentTitleInput) {
    return this.api.post<DepartmentTitleEntity, DepartmentTitleInput>(
      `/departments/${departmentId}/titles`,
      input,
    );
  }

  removeDepartmentTitle(departmentId: string, titleCode: string) {
    return this.api.delete<{ id: string }>(
      `/departments/${departmentId}/titles/${encodeURIComponent(titleCode)}`,
    );
  }

  addUserDepartment(userId: string, input: UserDepartmentInput) {
    return this.api.post<UserDepartmentEntity, UserDepartmentInput>(
      `/users/${userId}/departments`,
      input,
    );
  }

  removeUserDepartment(userId: string, departmentId: string) {
    return this.api.delete<{ id: string }>(`/users/${userId}/departments/${departmentId}`);
  }

  listFinanceRoles(query: { keyword?: string; status?: string } = {}) {
    return this.api
      .get<{ items: FinanceRoleEntity[] }>('/finance-roles', query)
      .pipe(map((response) => response.items));
  }

  createFinanceRole(input: CreateFinanceRoleInput) {
    return this.api.post<FinanceRoleEntity, CreateFinanceRoleInput>('/finance-roles', input);
  }

  updateFinanceRole(roleId: string, input: UpdateFinanceRoleInput) {
    return this.api.patch<FinanceRoleEntity, UpdateFinanceRoleInput>(
      `/finance-roles/${roleId}`,
      input,
    );
  }

  deleteFinanceRole(roleId: string) {
    return this.api.delete<{ id: string }>(`/finance-roles/${roleId}`);
  }

  listAllDepartments(query?: { keyword?: string; status?: string }) {
    return this.api
      .get<{ items: DepartmentEntity[] }>('/departments/all', query)
      .pipe(map((response) => response.items));
  }
}
