import type { PageResult } from '@core/types';
import type { UserDepartmentEntity, UserDepartmentInput } from '../../organization/models/organization.model';

export type UserStatus = 'active' | 'inactive';
export type OrganizationTitleCode = string;
export type ProjectTitleCode = string;

export interface UserEntity {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  mobile: string | null;
  organizationTitleCode: OrganizationTitleCode | null;
  organizationTitleName: string | null;
  defaultProjectTitleCode: ProjectTitleCode | null;
  defaultProjectTitleName: string | null;
  avatarUploadId: string | null;
  avatarUrl: string | null;
  loginEnabled: boolean;
  mustChangePassword: boolean;
  status: UserStatus;
  source: 'local' | 'imported';
  remark: string | null;
  departments: UserDepartmentEntity[];
  primaryDepartment: UserDepartmentEntity | null;
  managerUserId: string | null;
  managerUser: UserRef | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRef {
  id: string;
  username: string;
  displayName: string | null;
}

export interface UserListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: UserStatus | '';
  departmentId?: string;
}

export interface CreateUserInput {
  username: string;
  displayName?: string;
  email?: string;
  mobile?: string;
  organizationTitleCode?: OrganizationTitleCode;
  defaultProjectTitleCode?: ProjectTitleCode;
  remark?: string;
  loginEnabled?: boolean;
  departments?: UserDepartmentInput[];
  managerUserId?: string | null;
}

export interface UpdateUserInput {
  displayName?: string | null;
  email?: string | null;
  mobile?: string | null;
  organizationTitleCode?: OrganizationTitleCode | null;
  defaultProjectTitleCode?: ProjectTitleCode | null;
  status?: UserStatus;
  remark?: string | null;
  loginEnabled?: boolean;
  mustChangePassword?: boolean;
  departments?: UserDepartmentInput[];
  managerUserId?: string | null;
}

export interface ResetUserPasswordInput {
  newPassword?: string;
}

export interface ResetUserPasswordResult {
  userId: string;
  username: string;
  temporaryPassword: string;
  mustChangePassword: true;
}

export type UserListResult = PageResult<UserEntity>;
