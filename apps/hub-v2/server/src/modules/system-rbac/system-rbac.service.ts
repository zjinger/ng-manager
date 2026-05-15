import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import { requireAdmin } from "../utils/require-admin";
import type { RequestContext } from "../../shared/context/request-context";
import type { SystemRbacCommandContract, SystemRbacQueryContract, SystemRoleWithCounts } from "./system-rbac.contract";
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
import { SystemRbacRepo } from "./system-rbac.repo";

export class SystemRbacService implements SystemRbacCommandContract, SystemRbacQueryContract {
  constructor(private readonly repo: SystemRbacRepo) {}

  async listSystemRoles(query: ListSystemRolesQuery, ctx: RequestContext): Promise<SystemRoleWithCounts[]> {
    requireAdmin(ctx);
    const roles = this.repo.listRoles(query);
    return roles.map((role) => ({
      ...role,
      permissionCount: this.repo.countRolePermissions(role.id),
      userCount: this.repo.countRoleUsers(role.id)
    }));
  }

  async getSystemRoleDetail(id: string, ctx: RequestContext): Promise<SystemRoleDetail> {
    requireAdmin(ctx);
    const role = this.repo.findRoleById(id);
    if (!role) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${id}`, 404);
    }
    const permissions = this.repo.listRolePermissions(id);
    const userCount = this.repo.countRoleUsers(id);
    return {
      ...role,
      permissionCount: permissions.length,
      userCount,
      permissions
    };
  }

  async listPermissions(query: ListSystemPermissionsQuery, ctx: RequestContext): Promise<SystemPermissionEntity[]> {
    requireAdmin(ctx);
    return this.repo.listPermissions(query);
  }

  async listRoleUsers(roleId: string, ctx: RequestContext): Promise<RoleUserEntity[]> {
    requireAdmin(ctx);
    if (!this.repo.findRoleById(roleId)) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${roleId}`, 404);
    }
    return this.repo.listRoleUsers(roleId);
  }

  async listUserSystemRoles(userId: string, ctx: RequestContext): Promise<UserSystemRoleEntity[]> {
    if (!ctx.roles.includes("admin") && ctx.userId !== userId) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "forbidden", 403);
    }
    if (!this.repo.userExists(userId)) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${userId}`, 404);
    }
    return this.repo.listUserSystemRoles(userId);
  }

  async createSystemRole(input: CreateSystemRoleInput, ctx: RequestContext): Promise<SystemRoleEntity> {
    requireAdmin(ctx);
    const code = input.code.trim();
    if (this.repo.findRoleByCode(code)) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_EXISTS, `system role already exists: ${code}`, 409);
    }
    const now = nowIso();
    const entity: SystemRoleEntity = {
      id: genId("srole"),
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      isBuiltin: false,
      purposeCode: input.purposeCode?.trim() || "business",
      purposeName: input.purposeName?.trim() || "业务角色",
      status: input.status ?? "active",
      sort: input.sort ?? 0,
      createdAt: now,
      updatedAt: now
    };
    this.repo.createRole(entity);

    if (input.permissionTemplateRoleId) {
      const templateRole = this.repo.findRoleById(input.permissionTemplateRoleId);
      if (templateRole) {
        const templatePermissionIds = this.repo.listRolePermissionIds(templateRole.id);
        if (templatePermissionIds.length > 0) {
          this.repo.setRolePermissions(entity.id, templatePermissionIds);
        }
      }
    }

    return entity;
  }

  async updateSystemRole(id: string, input: UpdateSystemRoleInput, ctx: RequestContext): Promise<SystemRoleEntity> {
    requireAdmin(ctx);
    const current = this.repo.findRoleById(id);
    if (!current) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${id}`, 404);
    }
    if (current.isBuiltin) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_BUILTIN_UPDATE, "built-in role cannot be modified", 403);
    }
    const nextCode = input.code?.trim() ?? current.code;
    const sameCode = this.repo.findRoleByCode(nextCode);
    if (sameCode && sameCode.id !== current.id) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_EXISTS, `system role already exists: ${nextCode}`, 409);
    }
    const entity: SystemRoleEntity = {
      ...current,
      code: nextCode,
      name: input.name?.trim() ?? current.name,
      description: input.description === undefined ? current.description : input.description?.trim() || null,
      purposeCode: input.purposeCode?.trim() || current.purposeCode,
      purposeName: input.purposeName?.trim() || current.purposeName,
      status: input.status ?? current.status,
      sort: input.sort ?? current.sort,
      updatedAt: nowIso()
    };
    this.repo.updateRole(entity);
    return entity;
  }

  async deleteSystemRole(id: string, ctx: RequestContext): Promise<void> {
    requireAdmin(ctx);
    const role = this.repo.findRoleById(id);
    if (!role) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${id}`, 404);
    }
    if (role.isBuiltin) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_BUILTIN_DELETE, "built-in role cannot be deleted", 403);
    }
    this.repo.deleteRole(id);
  }

  async setRolePermissions(roleId: string, input: UpdateRolePermissionsInput, ctx: RequestContext): Promise<void> {
    requireAdmin(ctx);
    const role = this.repo.findRoleById(roleId);
    if (!role) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${roleId}`, 404);
    }
    if (role.isBuiltin) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_BUILTIN_UPDATE, "built-in role cannot be modified", 403);
    }
    for (const permissionId of input.permissionIds) {
      if (!this.repo.findPermissionById(permissionId)) {
        throw new AppError(ERROR_CODES.SYSTEM_PERMISSION_NOT_FOUND, `system permission not found: ${permissionId}`, 404);
      }
    }
    this.repo.setRolePermissions(roleId, input.permissionIds);
  }

  async addRoleUsers(roleId: string, input: AddRoleUsersInput, ctx: RequestContext): Promise<void> {
    requireAdmin(ctx);
    const role = this.repo.findRoleById(roleId);
    if (!role) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${roleId}`, 404);
    }
    const now = nowIso();
    for (const userId of input.userIds) {
      if (!this.repo.userExists(userId)) {
        throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${userId}`, 404);
      }
      this.repo.addRoleUser(roleId, userId, genId("usr"), now);
    }
  }

  async removeRoleUser(roleId: string, userId: string, ctx: RequestContext): Promise<void> {
    requireAdmin(ctx);
    const role = this.repo.findRoleById(roleId);
    if (!role) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${roleId}`, 404);
    }
    if (!this.repo.userExists(userId)) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${userId}`, 404);
    }
    this.repo.removeRoleUser(roleId, userId);
  }

  async createSystemPermission(input: CreateSystemPermissionInput, ctx: RequestContext): Promise<SystemPermissionEntity> {
    requireAdmin(ctx);
    const code = input.code.trim();
    if (this.repo.findPermissionByCode(code)) {
      throw new AppError(ERROR_CODES.SYSTEM_PERMISSION_EXISTS, `system permission already exists: ${code}`, 409);
    }
    const now = nowIso();
    const entity: SystemPermissionEntity = {
      id: genId("sperm"),
      code,
      name: input.name.trim(),
      status: input.status ?? "active",
      isBuiltin: input.isBuiltin === true,
      groupCode: input.groupCode.trim(),
      groupName: input.groupName.trim(),
      domainCode: input.domainCode?.trim() || "admin",
      domainName: input.domainName?.trim() || "后台管理",
      description: input.description?.trim() || null,
      sort: input.sort ?? 0,
      createdAt: now,
      updatedAt: now
    };
    this.repo.createPermission(entity);
    return entity;
  }

  async updateSystemPermission(id: string, input: UpdateSystemPermissionInput, ctx: RequestContext): Promise<SystemPermissionEntity> {
    requireAdmin(ctx);
    const current = this.repo.findPermissionById(id);
    if (!current) {
      throw new AppError(ERROR_CODES.SYSTEM_PERMISSION_NOT_FOUND, `system permission not found: ${id}`, 404);
    }
    if (current.isBuiltin && input.code && input.code.trim() !== current.code) {
      throw new AppError(ERROR_CODES.SYSTEM_PERMISSION_BUILTIN_UPDATE, "built-in permission code cannot be modified", 403);
    }
    const nextCode = input.code?.trim() ?? current.code;
    const sameCode = this.repo.findPermissionByCode(nextCode);
    if (sameCode && sameCode.id !== current.id) {
      throw new AppError(ERROR_CODES.SYSTEM_PERMISSION_EXISTS, `system permission already exists: ${nextCode}`, 409);
    }
    const entity: SystemPermissionEntity = {
      ...current,
      code: nextCode,
      name: input.name?.trim() ?? current.name,
      status: input.status ?? current.status,
      groupCode: input.groupCode?.trim() ?? current.groupCode,
      groupName: input.groupName?.trim() ?? current.groupName,
      domainCode: input.domainCode?.trim() ?? current.domainCode,
      domainName: input.domainName?.trim() ?? current.domainName,
      description: input.description === undefined ? current.description : input.description?.trim() || null,
      sort: input.sort ?? current.sort,
      updatedAt: nowIso()
    };
    this.repo.updatePermission(entity);
    return entity;
  }

  async deleteSystemPermission(id: string, ctx: RequestContext): Promise<void> {
    requireAdmin(ctx);
    const current = this.repo.findPermissionById(id);
    if (!current) {
      throw new AppError(ERROR_CODES.SYSTEM_PERMISSION_NOT_FOUND, `system permission not found: ${id}`, 404);
    }
    if (current.isBuiltin) {
      throw new AppError(ERROR_CODES.SYSTEM_PERMISSION_BUILTIN_DELETE, "built-in permission cannot be deleted", 403);
    }
    if (this.repo.countPermissionRoleBindings(id) > 0) {
      throw new AppError(ERROR_CODES.SYSTEM_PERMISSION_IN_USE, `system permission is in use: ${id}`, 409);
    }
    this.repo.deletePermission(id);
  }
}
