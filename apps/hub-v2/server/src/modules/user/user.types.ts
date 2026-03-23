import type { PageResult } from "../../shared/http/pagination";

export type UserStatus = "active" | "inactive";
export type UserSource = "local" | "imported";

export interface UserEntity {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  mobile: string | null;
  titleCode: string | null;
  status: UserStatus;
  source: UserSource;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  username: string;
  displayName?: string;
  email?: string;
  mobile?: string;
  titleCode?: string;
  remark?: string;
}

export interface UpdateUserInput {
  displayName?: string | null;
  email?: string | null;
  mobile?: string | null;
  titleCode?: string | null;
  status?: UserStatus;
  remark?: string | null;
}

export interface ListUsersQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: UserStatus;
}

export type UserListResult = PageResult<UserEntity>;
