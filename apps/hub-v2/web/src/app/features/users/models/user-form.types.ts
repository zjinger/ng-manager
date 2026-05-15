import type { UserStatus, UserTitleCode } from './user.model';

export type UserFormMode = 'create' | 'edit';
export type EditTab = 'basic' | 'security' | 'permissions' | 'history';

export interface UserDraft {
  username: string;
  displayName: string;
  email: string;
  mobile: string;
  titleCode: UserTitleCode | '';
  remark: string;
  status: UserStatus;
  loginEnabled: boolean;
  primaryDepartmentId: string;
  managerUserId: string;
}

export const DEFAULT_USER_DRAFT: UserDraft = {
  username: '',
  displayName: '',
  email: '',
  mobile: '',
  titleCode: '',
  remark: '',
  status: 'active',
  loginEnabled: true,
  primaryDepartmentId: '',
  managerUserId: '',
};
