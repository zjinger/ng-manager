export type SystemRoleStatus = 'active' | 'inactive';

export interface SystemRoleEntity {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isBuiltin: boolean;
  status: SystemRoleStatus;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemRoleWithCounts extends SystemRoleEntity {
  permissionCount: number;
  userCount: number;
}

export interface SystemPermissionEntity {
  id: string;
  code: string;
  name: string;
  groupCode: string;
  groupName: string;
  description: string | null;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemRoleDetail extends SystemRoleEntity {
  permissionCount: number;
  userCount: number;
  permissions: SystemPermissionEntity[];
}

export interface RoleUserEntity {
  id: string;
  userId: string;
  roleId: string;
  createdAt: string;
  username: string;
  displayName: string;
  email: string | null;
  avatarUploadId: string | null;
}

export interface UserSystemRoleEntity {
  id: string;
  userId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  createdAt: string;
}

export interface CreateSystemRoleInput {
  code: string;
  name: string;
  description?: string | null;
  status?: SystemRoleStatus;
  sort?: number;
  permissionTemplateRoleId?: string;
}

export type UpdateSystemRoleInput = Partial<Omit<CreateSystemRoleInput, 'permissionTemplateRoleId'>>;

export interface UpdateRolePermissionsInput {
  permissionIds: string[];
}

export interface AddRoleUsersInput {
  userIds: string[];
}
