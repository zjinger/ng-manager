import type { PageResult } from "../../shared/http/pagination";
import type { UserDepartmentEntity, UserDepartmentInput } from "../organization/organization.types";

export type UserStatus = "active" | "inactive";
export type UserSource = "local" | "imported";

export interface UserEntity {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  mobile: string | null;
  titleCode: string | null;
  avatarUploadId: string | null;
  avatarUrl: string | null;
  loginEnabled: boolean;
  status: UserStatus;
  source: UserSource;
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

export interface CreateUserInput {
  username: string;
  displayName?: string;
  email?: string;
  mobile?: string;
  titleCode?: string;
  remark?: string;
  loginEnabled?: boolean;
  departments?: UserDepartmentInput[];
  managerUserId?: string | null;
}

export interface UpdateUserInput {
  displayName?: string | null;
  email?: string | null;
  mobile?: string | null;
  titleCode?: string | null;
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

export interface ListUsersQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: UserStatus;
  departmentId?: string;
}

export type UserListResult = PageResult<UserEntity>;
