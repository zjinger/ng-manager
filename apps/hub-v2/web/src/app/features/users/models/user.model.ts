import type { PageResult } from '@core/types';
import type { UserDepartmentEntity, UserDepartmentInput } from '../../organization/models/organization.model';

export type UserStatus = 'active' | 'inactive';
export type UserTitleCode = string;

export interface UserEntity {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  mobile: string | null;
  titleCode: UserTitleCode | null;
  avatarUploadId: string | null;
  avatarUrl: string | null;
  loginEnabled: boolean;
  status: UserStatus;
  source: 'local' | 'imported';
  remark: string | null;
  departments: UserDepartmentEntity[];
  primaryDepartment: UserDepartmentEntity | null;
  managerUserId: string | null;
  managerUser: UserRef | null;
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
  titleCode?: UserTitleCode;
  remark?: string;
  loginEnabled?: boolean;
  departments?: UserDepartmentInput[];
  managerUserId?: string | null;
}

export interface UpdateUserInput {
  displayName?: string | null;
  email?: string | null;
  mobile?: string | null;
  titleCode?: UserTitleCode | null;
  status?: UserStatus;
  remark?: string | null;
  loginEnabled?: boolean;
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
