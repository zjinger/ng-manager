import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import { requireAdmin } from "../utils/require-admin";
import { UserRepo } from "./user.repo";
import type { UserCommandContract, UserQueryContract } from "./user.contract";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput, UserEntity, UserListResult } from "./user.types";

export class UserService implements UserCommandContract, UserQueryContract {
  constructor(private readonly repo: UserRepo) {}

  async create(input: CreateUserInput, ctx: RequestContext): Promise<UserEntity> {
    requireAdmin(ctx);
    if (this.repo.findByUsername(input.username.trim())) {
      throw new AppError("USER_ALREADY_EXISTS", `user already exists: ${input.username}`, 409);
    }

    const now = nowIso();
    const entity: UserEntity = {
      id: genId("usr"),
      username: input.username.trim(),
      displayName: input.displayName?.trim() || null,
      email: input.email?.trim() || null,
      mobile: input.mobile?.trim() || null,
      titleCode: input.titleCode?.trim() || null,
      status: "active",
      source: "local",
      remark: input.remark?.trim() || null,
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
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
      status: input.status ?? user.status,
      remark: input.remark === undefined ? user.remark : input.remark?.trim() || null,
      updatedAt: nowIso()
    };

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
}
