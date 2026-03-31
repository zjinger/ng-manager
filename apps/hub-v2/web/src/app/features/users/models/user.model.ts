import type { PageResult } from '@core/types';

export type UserStatus = 'active' | 'inactive';
export type UserTitleCode = 'product' | 'ui' | 'frontend_dev' | 'backend_dev' | 'qa' | 'ops' | 'other';

export const USER_TITLE_OPTIONS: ReadonlyArray<{ label: string; value: UserTitleCode }> = [
  { label: '产品', value: 'product' },
  { label: 'UI', value: 'ui' },
  { label: '前端开发', value: 'frontend_dev' },
  { label: '后端开发', value: 'backend_dev' },
  { label: '测试', value: 'qa' },
  { label: '运维', value: 'ops' },
  { label: '其他', value: 'other' },
];

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
  titleCode?: UserTitleCode;
  remark?: string;
  loginEnabled?: boolean;
}

export interface UpdateUserInput {
  displayName?: string | null;
  email?: string | null;
  mobile?: string | null;
  titleCode?: UserTitleCode | null;
  status?: UserStatus;
  remark?: string | null;
  loginEnabled?: boolean;
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
