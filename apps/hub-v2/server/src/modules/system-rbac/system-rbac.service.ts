import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { RequestContext } from "../../shared/context/request-context";
import type { AuditLogCommandContract } from "../audit-log/audit-log.contract";
import { requirePermission } from "../utils/require-permission";
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
  private static readonly MANAGE_PERMISSION = "admin.roles.manage";

  constructor(
    private readonly repo: SystemRbacRepo,
    private readonly auditLog?: AuditLogCommandContract
  ) {}

  async listSystemRoles(query: ListSystemRolesQuery, ctx: RequestContext): Promise<SystemRoleWithCounts[]> {
    this.requireManage(ctx);
    const roles = this.repo.listRoles(query);
    return roles.map((role) => ({
      ...role,
      permissionCount: this.repo.countRolePermissions(role.id),
      userCount: this.repo.countRoleUsers(role.id)
    }));
  }

  async getSystemRoleDetail(id: string, ctx: RequestContext): Promise<SystemRoleDetail> {
    this.requireManage(ctx);
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
    this.requireManage(ctx);
    return this.repo.listPermissions(query);
  }

  async listRoleUsers(roleId: string, ctx: RequestContext): Promise<RoleUserEntity[]> {
    this.requireManage(ctx);
    if (!this.repo.findRoleById(roleId)) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${roleId}`, 404);
    }
    return this.repo.listRoleUsers(roleId);
  }

  async listUserSystemRoles(userId: string, ctx: RequestContext): Promise<UserSystemRoleEntity[]> {
    if (ctx.userId !== userId) {
      this.requireManage(ctx);
    }
    if (!this.repo.userExists(userId)) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${userId}`, 404);
    }
    return this.repo.listUserSystemRoles(userId);
  }

  async createSystemRole(input: CreateSystemRoleInput, _ctx: RequestContext): Promise<SystemRoleEntity> {
    this.requireManage(_ctx);
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

    this.auditLog?.record(
      {
        module: "role",
        action: "create",
        targetType: "system_role",
        targetId: entity.id,
        targetName: entity.name,
        summary: `创建角色「${entity.name}」`,
        after: entity,
        meta: { permissionTemplateRoleId: input.permissionTemplateRoleId ?? null }
      },
      _ctx
    );
    return entity;
  }

  async updateSystemRole(id: string, input: UpdateSystemRoleInput, _ctx: RequestContext): Promise<SystemRoleEntity> {
    this.requireManage(_ctx);
    const current = this.repo.findRoleById(id);
    if (!current) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${id}`, 404);
    }
    if (this.isProtectedSystemRole(current)) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_BUILTIN_UPDATE, "super admin role cannot be modified", 403);
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
    this.auditLog?.record(
      {
        module: "role",
        action: entity.status === "inactive" ? "disable" : "update",
        targetType: "system_role",
        targetId: entity.id,
        targetName: entity.name,
        summary: `更新角色「${entity.name}」`,
        before: current,
        after: entity
      },
      _ctx
    );
    return entity;
  }

  async deleteSystemRole(id: string, _ctx: RequestContext): Promise<void> {
    this.requireManage(_ctx);
    const role = this.repo.findRoleById(id);
    if (!role) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${id}`, 404);
    }
    if (role.isBuiltin) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_BUILTIN_DELETE, "built-in role cannot be deleted", 403);
    }
    this.repo.deleteRole(id);
    this.auditLog?.record(
      {
        module: "role",
        action: "delete",
        targetType: "system_role",
        targetId: role.id,
        targetName: role.name,
        summary: `删除角色「${role.name}」`,
        before: role
      },
      _ctx
    );
  }

  async setRolePermissions(roleId: string, input: UpdateRolePermissionsInput, _ctx: RequestContext): Promise<void> {
    this.requireManage(_ctx);
    const role = this.repo.findRoleById(roleId);
    if (!role) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${roleId}`, 404);
    }
    if (this.isProtectedSystemRole(role)) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_BUILTIN_UPDATE, "super admin role cannot be modified", 403);
    }
    for (const permissionId of input.permissionIds) {
      if (!this.repo.findPermissionById(permissionId)) {
        throw new AppError(ERROR_CODES.SYSTEM_PERMISSION_NOT_FOUND, `system permission not found: ${permissionId}`, 404);
      }
    }
    const beforePermissionIds = this.repo.listRolePermissionIds(roleId);
    this.repo.setRolePermissions(roleId, input.permissionIds);
    this.auditLog?.record(
      {
        module: "role",
        action: "assign",
        targetType: "system_role_permissions",
        targetId: role.id,
        targetName: role.name,
        summary: `更新角色「${role.name}」的权限配置`,
        before: { permissionIds: beforePermissionIds },
        after: { permissionIds: input.permissionIds }
      },
      _ctx
    );
  }

  async addRoleUsers(roleId: string, input: AddRoleUsersInput, _ctx: RequestContext): Promise<void> {
    this.requireManage(_ctx);
    const role = this.repo.findRoleById(roleId);
    if (!role) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${roleId}`, 404);
    }
    if (this.isProtectedSystemRole(role)) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_BUILTIN_UPDATE, "super admin role cannot be modified", 403);
    }
    const now = nowIso();
    const users: Array<{ id: string; username: string | null; displayName: string | null; label: string }> = [];
    for (const userId of input.userIds) {
      if (!this.repo.userExists(userId)) {
        throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${userId}`, 404);
      }
      const user = this.repo.findUserById(userId);
      users.push({
        id: userId,
        username: user?.username ?? null,
        displayName: user?.displayName ?? null,
        label: user?.displayName?.trim() || user?.username?.trim() || userId
      });
      this.repo.addRoleUser(roleId, userId, genId("usr"), now);
    }
    const userLabel = users.length > 3
      ? `${users.slice(0, 3).map((user) => user.label).join("、")} 等 ${users.length} 名用户`
      : users.map((user) => user.label).join("、");
    this.auditLog?.record(
      {
        module: "role",
        action: "assign",
        targetType: "system_role_users",
        targetId: role.id,
        targetName: role.name,
        summary: `为角色「${role.name}」添加用户「${userLabel}」`,
        after: { users }
      },
      _ctx
    );
  }

  async removeRoleUser(roleId: string, userId: string, _ctx: RequestContext): Promise<void> {
    this.requireManage(_ctx);
    const role = this.repo.findRoleById(roleId);
    if (!role) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${roleId}`, 404);
    }
    if (this.isProtectedSystemRole(role)) {
      throw new AppError(ERROR_CODES.SYSTEM_ROLE_BUILTIN_UPDATE, "super admin role cannot be modified", 403);
    }
    if (!this.repo.userExists(userId)) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${userId}`, 404);
    }
    const user = this.repo.findUserById(userId);
    const userLabel = user?.displayName?.trim() || user?.username?.trim() || userId;
    this.repo.removeRoleUser(roleId, userId);
    this.auditLog?.record(
      {
        module: "role",
        action: "remove",
        targetType: "system_role_user",
        targetId: `${role.id}:${userId}`,
        targetName: role.name,
        summary: `从角色「${role.name}」移除用户「${userLabel}」`,
        before: { userId, username: user?.username ?? null, displayName: user?.displayName ?? null }
      },
      _ctx
    );
  }

  async createSystemPermission(input: CreateSystemPermissionInput, _ctx: RequestContext): Promise<SystemPermissionEntity> {
    this.requireManage(_ctx);
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
    this.auditLog?.record(
      {
        module: "permission",
        action: "create",
        targetType: "system_permission",
        targetId: entity.id,
        targetName: entity.name,
        summary: `创建权限项「${entity.name}」`,
        after: entity
      },
      _ctx
    );
    return entity;
  }

  async updateSystemPermission(id: string, input: UpdateSystemPermissionInput, _ctx: RequestContext): Promise<SystemPermissionEntity> {
    this.requireManage(_ctx);
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
    this.auditLog?.record(
      {
        module: "permission",
        action: entity.status === "inactive" ? "disable" : "update",
        targetType: "system_permission",
        targetId: entity.id,
        targetName: entity.name,
        summary: `更新权限项「${entity.name}」`,
        before: current,
        after: entity
      },
      _ctx
    );
    return entity;
  }

  async deleteSystemPermission(id: string, _ctx: RequestContext): Promise<void> {
    this.requireManage(_ctx);
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
    this.auditLog?.record(
      {
        module: "permission",
        action: "delete",
        targetType: "system_permission",
        targetId: current.id,
        targetName: current.name,
        summary: `删除权限项「${current.name}」`,
        before: current
      },
      _ctx
    );
  }

  private requireManage(ctx: RequestContext): void {
    requirePermission(ctx, SystemRbacService.MANAGE_PERMISSION);
  }

  private isProtectedSystemRole(role: SystemRoleEntity): boolean {
    return role.code === "super_admin";
  }
}
