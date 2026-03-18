import type { AdminUserStatus } from "../auth/auth.types";
import type { UserTitleCode } from "./user.constants";

export type UserStatus = "active" | "inactive";
export type UserSource = "local" | "imported";

export interface UserEntity {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  mobile: string | null;
  titleCode: UserTitleCode | null;
  status: UserStatus;
  source: UserSource;
  remark: string | null;
  loginAccountStatus: AdminUserStatus | null;
  loginAccountUsername: string | null;
  avatarUploadId?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  username: string;
  displayName?: string | null;
  email?: string;
  mobile?: string;
  titleCode?: UserTitleCode | null;
  status?: UserStatus;
  source?: UserSource;
  remark?: string;
}

export interface UpdateUserInput {
  username?: string;
  displayName?: string | null;
  email?: string | null;
  mobile?: string | null;
  titleCode?: UserTitleCode | null;
  status?: UserStatus;
  source?: UserSource;
  remark?: string | null;
}

export interface EnableUserLoginAccountInput {
  userId: string;
  username?: string;
  password?: string;
  mustChangePassword?: boolean;
}

export interface ResetUserPasswordInput {
  userId: string;
  newPassword: string;
  mustChangePassword?: boolean;
}

export interface ListUserQuery {
  status?: UserStatus;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface UserListResult {
  items: UserEntity[];
  page: number;
  pageSize: number;
  total: number;
}
