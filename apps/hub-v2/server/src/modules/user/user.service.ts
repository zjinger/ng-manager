import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { hashPassword } from "../../shared/utils/password";
import { nowIso } from "../../shared/utils/time";
import { AuthRepo } from "../auth/auth.repo";
import { requireAdmin } from "../utils/require-admin";
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
    private readonly authRepo: AuthRepo
  ) {}

  async create(input: CreateUserInput, ctx: RequestContext): Promise<UserEntity> {
    requireAdmin(ctx);
    const username = input.username.trim();
    if (this.repo.findByUsername(username) || this.authRepo.findByUsername(username)) {
      throw new AppError("USER_ALREADY_EXISTS", `user already exists: ${input.username}`, 409);
    }

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
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
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
    }

    return entity;
  }

  async list(query: ListUsersQuery, ctx: RequestContext): Promise<UserListResult> {
    if (!ctx.userId?.trim() && !ctx.roles.includes("admin")) {
      return {
        items: [],
        page: query.page && query.page > 0 ? query.page : 1,
        pageSize: query.pageSize && query.pageSize > 0 ? query.pageSize : 20,
        total: 0
      };
    }
    return this.repo.list(query);
  }

  async update(id: string, input: UpdateUserInput, ctx: RequestContext): Promise<UserEntity> {
    requireAdmin(ctx);
    const user = this.repo.findById(id);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", `user not found: ${id}`, 404);
    }

    const updated: UserEntity = {
      ...user,
      displayName: input.displayName === undefined ? user.displayName : input.displayName?.trim() || null,
      email: input.email === undefined ? user.email : input.email?.trim() || null,
      mobile: input.mobile === undefined ? user.mobile : input.mobile?.trim() || null,
      titleCode: input.titleCode === undefined ? user.titleCode : input.titleCode?.trim() || null,
      loginEnabled: input.loginEnabled === undefined ? user.loginEnabled : input.loginEnabled,
      status: input.status ?? user.status,
      remark: input.remark === undefined ? user.remark : input.remark?.trim() || null,
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
      } else if (account.status !== "active") {
        this.authRepo.updateStatus(account.id, "active", updated.updatedAt);
      }
    } else if (account && account.status !== "inactive") {
      this.authRepo.updateStatus(account.id, "inactive", updated.updatedAt);
    }

    this.repo.update(id, updated, updated.updatedAt);
    return updated;
  }

  async getById(id: string, ctx: RequestContext): Promise<UserEntity> {
    if (!ctx.userId?.trim() && !ctx.roles.includes("admin")) {
      throw new AppError("USER_ACCESS_DENIED", "get user forbidden", 403);
    }
    const user = this.repo.findById(id);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", `user not found: ${id}`, 404);
    }
    return user;
  }

  async resetPassword(id: string, input: ResetUserPasswordInput, ctx: RequestContext): Promise<ResetUserPasswordResult> {
    requireAdmin(ctx);
    const user = this.repo.findById(id);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", `user not found: ${id}`, 404);
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
    } else {
      this.authRepo.resetPassword(account.id, passwordHash, now);
    }

    return {
      userId: user.id,
      username: user.username,
      temporaryPassword: nextPassword,
      mustChangePassword: true
    };
  }
}
