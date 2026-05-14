export type SystemRoleStatus = "active" | "inactive";

export interface SystemRoleEntity {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isBuiltin: boolean;
  purposeCode: string;
  purposeName: string;
  status: SystemRoleStatus;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemPermissionEntity {
  id: string;
  code: string;
  name: string;
  groupCode: string;
  groupName: string;
  domainCode: string;
  domainName: string;
  description: string | null;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemRolePermissionRow {
  roleId: string;
  permissionId: string;
  createdAt: string;
}

export interface UserSystemRoleEntity {
  id: string;
  userId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  createdAt: string;
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

export interface CreateSystemRoleInput {
  code: string;
  name: string;
  description?: string | null;
  purposeCode?: string;
  purposeName?: string;
  status?: SystemRoleStatus;
  sort?: number;
  permissionTemplateRoleId?: string;
}

export interface UpdateSystemRoleInput {
  code?: string;
  name?: string;
  description?: string | null;
  purposeCode?: string;
  purposeName?: string;
  status?: SystemRoleStatus;
  sort?: number;
}

export interface ListSystemRolesQuery {
  keyword?: string;
  status?: SystemRoleStatus | "";
}

export interface SystemRoleDetail extends SystemRoleEntity {
  permissionCount: number;
  userCount: number;
  permissions: SystemPermissionEntity[];
}

export interface UpdateRolePermissionsInput {
  permissionIds: string[];
}

export interface AddRoleUsersInput {
  userIds: string[];
}
