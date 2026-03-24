import type { PageResult } from '../../../core/types/page.types';

export type UserStatus = 'active' | 'inactive';

export interface UserEntity {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  mobile: string | null;
  titleCode: string | null;
  avatarUploadId: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  source: 'local' | 'imported';
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: UserStatus | '';
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

export type UserListResult = PageResult<UserEntity>;
