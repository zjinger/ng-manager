import type { RequestContext } from "../../shared/context/request-context";
import type {
  SystemRoleEntity,
  SystemRoleDetail,
  SystemPermissionEntity,
  RoleUserEntity,
  UserSystemRoleEntity,
  CreateSystemRoleInput,
  UpdateSystemRoleInput,
  ListSystemRolesQuery,
  ListSystemPermissionsQuery,
  UpdateRolePermissionsInput,
  AddRoleUsersInput,
  CreateSystemPermissionInput,
  UpdateSystemPermissionInput
} from "./system-rbac.types";

export interface SystemRbacCommandContract {
  createSystemRole(input: CreateSystemRoleInput, ctx: RequestContext): Promise<SystemRoleEntity>;
  updateSystemRole(id: string, input: UpdateSystemRoleInput, ctx: RequestContext): Promise<SystemRoleEntity>;
  deleteSystemRole(id: string, ctx: RequestContext): Promise<void>;
  setRolePermissions(roleId: string, input: UpdateRolePermissionsInput, ctx: RequestContext): Promise<void>;
  addRoleUsers(roleId: string, input: AddRoleUsersInput, ctx: RequestContext): Promise<void>;
  removeRoleUser(roleId: string, userId: string, ctx: RequestContext): Promise<void>;
  createSystemPermission(input: CreateSystemPermissionInput, ctx: RequestContext): Promise<SystemPermissionEntity>;
  updateSystemPermission(id: string, input: UpdateSystemPermissionInput, ctx: RequestContext): Promise<SystemPermissionEntity>;
  deleteSystemPermission(id: string, ctx: RequestContext): Promise<void>;
}

export interface SystemRoleWithCounts extends SystemRoleEntity {
  permissionCount: number;
  userCount: number;
}

export interface SystemRbacQueryContract {
  listSystemRoles(query: ListSystemRolesQuery, ctx: RequestContext): Promise<SystemRoleWithCounts[]>;
  getSystemRoleDetail(id: string, ctx: RequestContext): Promise<SystemRoleDetail>;
  listPermissions(query: ListSystemPermissionsQuery, ctx: RequestContext): Promise<SystemPermissionEntity[]>;
  listRoleUsers(roleId: string, ctx: RequestContext): Promise<RoleUserEntity[]>;
  listUserSystemRoles(userId: string, ctx: RequestContext): Promise<UserSystemRoleEntity[]>;
}
