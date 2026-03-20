import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import { requireAdmin } from "../utils/require-admin";
import { UserRepo } from "./user.repo";
import type { UserCommandContract, UserQueryContract } from "./user.contract";
import type { CreateUserInput, ListUsersQuery, UserEntity, UserListResult } from "./user.types";

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
    requireAdmin(ctx);
    return this.repo.list(query);
  }

  async getById(id: string, ctx: RequestContext): Promise<UserEntity> {
    requireAdmin(ctx);
    const user = this.repo.findById(id);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", `user not found: ${id}`, 404);
    }
    return user;
  }
}
