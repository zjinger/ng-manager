import type { OrganizationTitleCode, ProjectTitleCode, UserStatus } from './user.model';

export type UserFormMode = 'create' | 'edit';
export type EditTab = 'basic' | 'security' | 'permissions' | 'history';

export interface UserDraft {
  username: string;
  displayName: string;
  email: string;
  mobile: string;
  organizationTitleCode: OrganizationTitleCode | '';
  defaultProjectTitleCode: ProjectTitleCode | '';
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
  organizationTitleCode: '',
  defaultProjectTitleCode: '',
  remark: '',
  status: 'active',
  loginEnabled: true,
  primaryDepartmentId: '',
  managerUserId: '',
};
