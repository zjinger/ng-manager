import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { hashPassword } from "../../shared/utils/password";
import { nowIso } from "../../shared/utils/time";
import { AuthRepo } from "../auth/auth.repo";
import { OrganizationService } from "../organization/organization.service";
import { PlatformRoleSyncService } from "../system-rbac/platform-role-sync.service";
import { SystemTitleService } from "../system-title/system-title.service";
import type { AuditLogCommandContract } from "../audit-log/audit-log.contract";
import { UserRepo } from "./user.repo";
import type { UserCommandContract, UserQueryContract } from "./user.contract";
import type {
  CreateUserInput,
  ListUsersQuery,
  ResetUserPasswordInput,
  ResetUserPasswordResult,
  UpdateUserInput,
  UserEntity,
  UserListResult
} from "./user.types";

const DEFAULT_USER_PASSWORD = "12345678";

export class UserService implements UserCommandContract, UserQueryContract {
  constructor(
    private readonly repo: UserRepo,
    private readonly authRepo: AuthRepo,
    private readonly organization: OrganizationService,
    private readonly platformRoleSync: PlatformRoleSyncService,
    private readonly systemTitleService: SystemTitleService,
    private readonly auditLog?: AuditLogCommandContract
  ) {}

  async create(input: CreateUserInput, _ctx: RequestContext): Promise<UserEntity> {
    const username = input.username.trim();
    if (this.repo.findByUsername(username) || this.authRepo.findByUsername(username)) {
      throw new AppError(ERROR_CODES.USER_ALREADY_EXISTS, `user already exists: ${input.username}`, 409);
    }
    this.organization.validateUserDepartmentInputs(input.departments);
    this.validateTitleCode(input.titleCode);
    this.validateUserReference(input.managerUserId, "manager user");

    const now = nowIso();
    const loginEnabled = input.loginEnabled !== false;
    const entity: UserEntity = {
      id: genId("usr"),
      username,
      displayName: input.displayName?.trim() || null,
      email: input.email?.trim() || null,
      mobile: input.mobile?.trim() || null,
      titleCode: input.titleCode?.trim() || null,
      avatarUploadId: null,
      avatarUrl: null,
      loginEnabled,
      status: "active",
      source: "local",
      remark: input.remark?.trim() || null,
      departments: [],
      primaryDepartment: null,
      managerUserId: input.managerUserId?.trim() || null,
      managerUser: null,
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
    this.organization.replaceUserDepartmentsFromUserModule(entity.id, input.departments);
    if (loginEnabled) {
      this.authRepo.create({
        id: genId("adm"),
        userId: entity.id,
        username: entity.username,
        passwordHash: hashPassword(DEFAULT_USER_PASSWORD),
        nickname: entity.displayName || entity.username,
        role: "user",
        status: entity.status,
        mustChangePassword: true,
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now
      });
      this.platformRoleSync.syncFromLegacyRole(entity.id, "user", now);
    }

    this.auditLog?.record(
      {
        module: "user",
        action: "create",
        targetType: "user",
        targetId: entity.id,
        targetName: entity.displayName || entity.username,
        summary: `创建用户「${entity.displayName || entity.username}」`,
        after: { ...entity, departments: input.departments ?? [] },
        meta: { loginEnabled }
      },
      _ctx
    );
    return this.withDepartments(entity);
  }

  async list(query: ListUsersQuery, ctx: RequestContext): Promise<UserListResult> {
    if (!ctx.userId?.trim() && !this.canManageUsers(ctx)) {
      return {
        items: [],
        page: query.page && query.page > 0 ? query.page : 1,
        pageSize: query.pageSize && query.pageSize > 0 ? query.pageSize : 20,
        total: 0
      };
    }
    const result = this.repo.list(query);
    return {
      ...result,
      items: this.withDepartmentsMany(result.items)
    };
  }

  async update(id: string, input: UpdateUserInput, _ctx: RequestContext): Promise<UserEntity> {
    const user = this.repo.findById(id);
    if (!user) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${id}`, 404);
    }
    this.organization.validateUserDepartmentInputs(input.departments);
    this.validateTitleCode(input.titleCode);
    this.validateUserReference(input.managerUserId, "manager user", id);

    const updated: UserEntity = {
      ...user,
      displayName: input.displayName === undefined ? user.displayName : input.displayName?.trim() || null,
      email: input.email === undefined ? user.email : input.email?.trim() || null,
      mobile: input.mobile === undefined ? user.mobile : input.mobile?.trim() || null,
      titleCode: input.titleCode === undefined ? user.titleCode : input.titleCode?.trim() || null,
      loginEnabled: input.loginEnabled === undefined ? user.loginEnabled : input.loginEnabled,
      status: input.status ?? user.status,
      remark: input.remark === undefined ? user.remark : input.remark?.trim() || null,
      managerUserId: input.managerUserId === undefined ? user.managerUserId : input.managerUserId?.trim() || null,
      managerUser: input.managerUserId === undefined ? user.managerUser : null,
      updatedAt: nowIso()
    };

    const account = this.authRepo.findByUserId(user.id) ?? this.authRepo.findByUsername(user.username);
    if (updated.loginEnabled) {
      if (!account) {
        this.authRepo.create({
          id: genId("adm"),
          userId: user.id,
          username: user.username,
          passwordHash: hashPassword(DEFAULT_USER_PASSWORD),
          nickname: updated.displayName || user.username,
          role: "user",
          status: updated.status,
          mustChangePassword: true,
          lastLoginAt: null,
          createdAt: updated.updatedAt,
          updatedAt: updated.updatedAt
        });
        this.platformRoleSync.syncFromLegacyRole(user.id, "user", updated.updatedAt);
      } else if (account.status !== "active") {
        this.authRepo.updateStatus(account.id, "active", updated.updatedAt);
        this.platformRoleSync.syncFromLegacyRole(user.id, account.role, updated.updatedAt);
      }
    } else if (account && account.status !== "inactive") {
      this.authRepo.updateStatus(account.id, "inactive", updated.updatedAt);
      this.platformRoleSync.syncFromLegacyRole(user.id, account.role, updated.updatedAt);
    }

    this.repo.update(id, updated, updated.updatedAt);
    this.organization.replaceUserDepartmentsFromUserModule(id, input.departments);
    const action = user.loginEnabled !== updated.loginEnabled
      ? updated.loginEnabled ? "enable" : "disable"
      : updated.status === "inactive" ? "disable" : "update";
    this.auditLog?.record(
      {
        module: "user",
        action,
        targetType: "user",
        targetId: updated.id,
        targetName: updated.displayName || updated.username,
        summary: `更新用户「${updated.displayName || updated.username}」`,
        before: user,
        after: { ...updated, departments: input.departments ?? undefined }
      },
      _ctx
    );
    return this.withDepartments(updated);
  }

  async getById(id: string, ctx: RequestContext): Promise<UserEntity> {
    if (!ctx.userId?.trim() && !this.canManageUsers(ctx)) {
      throw new AppError(ERROR_CODES.USER_ACCESS_DENIED, "get user forbidden", 403);
    }
    const user = this.repo.findById(id);
    if (!user) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${id}`, 404);
    }
    return this.withDepartments(user);
  }

  async resetPassword(id: string, input: ResetUserPasswordInput, _ctx: RequestContext): Promise<ResetUserPasswordResult> {
    const user = this.repo.findById(id);
    if (!user) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${id}`, 404);
    }

    const nextPassword = input.newPassword?.trim() || DEFAULT_USER_PASSWORD;
    const now = nowIso();
    const passwordHash = hashPassword(nextPassword);
    const account = this.authRepo.findByUserId(user.id) ?? this.authRepo.findByUsername(user.username);

    if (!account) {
      this.authRepo.create({
        id: genId("adm"),
        userId: user.id,
        username: user.username,
        passwordHash,
        nickname: user.displayName || user.username,
        role: "user",
        status: user.status,
        mustChangePassword: true,
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now
      });
      this.platformRoleSync.syncFromLegacyRole(user.id, "user", now);
    } else {
      this.authRepo.resetPassword(account.id, passwordHash, now);
      this.platformRoleSync.syncFromLegacyRole(user.id, account.role, now);
    }

    this.auditLog?.record(
      {
        module: "user",
        action: "reset",
        targetType: "user",
        targetId: user.id,
        targetName: user.displayName || user.username,
        summary: `重置用户「${user.displayName || user.username}」的登录密码`,
        meta: { mustChangePassword: true }
      },
      _ctx
    );
    return {
      userId: user.id,
      username: user.username,
      temporaryPassword: nextPassword,
      mustChangePassword: true
    };
  }

  private withDepartments(user: UserEntity): UserEntity {
    return this.repo.attachDepartments(user, this.organization.listUserDepartmentsForUsers([user.id]).get(user.id) ?? []);
  }

  private withDepartmentsMany(users: UserEntity[]): UserEntity[] {
    const map = this.organization.listUserDepartmentsForUsers(users.map((user) => user.id));
    return users.map((user) => this.repo.attachDepartments(user, map.get(user.id) ?? []));
  }

  private validateUserReference(userId: string | null | undefined, label: string, currentUserId?: string): void {
    const normalized = userId?.trim();
    if (!normalized) {
      return;
    }
    if (currentUserId && normalized === currentUserId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `${label} cannot be self`, 400);
    }
    if (!this.repo.findById(normalized)) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `${label} not found: ${normalized}`, 404);
    }
  }

  private validateTitleCode(titleCode: string | null | undefined): void {
    const normalized = titleCode?.trim();
    if (!normalized) {
      return;
    }
    const title = this.systemTitleService.getSystemTitleByCode(normalized);
    if (!title) {
      throw new AppError(ERROR_CODES.SYSTEM_TITLE_NOT_FOUND, `system title not found: ${normalized}`, 404);
    }
    if (title.status !== "active") {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `system title is inactive: ${normalized}`, 400);
    }
  }

  private canManageUsers(ctx: RequestContext): boolean {
    return (ctx.authScopes ?? []).includes("admin.users.manage");
  }
}
