import Database from "better-sqlite3";
import { env } from "../../env";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import { AuthService } from "../auth/auth.service";
import { USER_TITLES } from "./user.constants";
import { UserRepo } from "./user.repo";
import type {
  CreateUserInput,
  EnableUserLoginAccountInput,
  ListUserQuery,
  ResetUserPasswordInput,
  UpdateUserInput,
  UserEntity,
  UserListResult
} from "./user.types";

export class UserService {
  constructor(
    private readonly repo: UserRepo,
    private readonly authService: AuthService
  ) {}

  list(query: ListUserQuery): UserListResult {
    return this.repo.list(query);
  }

  getTitles(): readonly { label: string; value: string }[] {
    return USER_TITLES;
  }

  getById(id: string): UserEntity {
    const user = this.repo.findById(id);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", `user not found: ${id}`, 404);
    }
    return user;
  }

  create(input: CreateUserInput): UserEntity {
    const username = input.username.trim();
    const displayName = input.displayName?.trim() || null;

    if (!username) {
      throw new AppError("USER_USERNAME_REQUIRED", "username is required", 400);
    }

    this.ensureUsernameUnique(username);

    const now = nowIso();
    const entity: UserEntity = {
      id: genId("usr"),
      username,
      displayName,
      email: input.email?.trim() || null,
      mobile: input.mobile?.trim() || null,
      titleCode: input.titleCode ?? null,
      status: input.status ?? "active",
      source: input.source ?? "local",
      remark: input.remark?.trim() || null,
      loginAccountStatus: null,
      loginAccountUsername: null,
      createdAt: now,
      updatedAt: now
    };

    try {
      this.repo.runInTransaction(() => {
        this.repo.create(entity);
        this.authService.createUserLoginAccount({
          userId: entity.id,
          username: entity.username,
          nickname: entity.displayName || entity.username,
          status: entity.status === "active" ? "active" : "disabled",
          role: "user",
          password: env.initUserDefaultPassword,
          mustChangePassword: true
        });
      });
    } catch (error) {
      this.handleSqliteError(error, username);
    }

    return this.getById(entity.id);
  }

  update(id: string, input: UpdateUserInput): UserEntity {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("USER_NOT_FOUND", `user not found: ${id}`, 404);
    }

    const username = input.username?.trim();
    const displayName =
      input.displayName === undefined ? undefined : (input.displayName?.trim() || null);

    if (username !== undefined && !username) {
      throw new AppError("USER_USERNAME_REQUIRED", "username is required", 400);
    }

    if (username && username.toLowerCase() !== existing.username.toLowerCase()) {
      this.ensureUsernameUnique(username, id);
    }

    const changed = this.repo.update(id, {
      username,
      displayName,
      email: input.email === undefined ? undefined : input.email?.trim() || null,
      mobile: input.mobile === undefined ? undefined : input.mobile?.trim() || null,
      titleCode: input.titleCode,
      status: input.status,
      source: input.source,
      remark: input.remark === undefined ? undefined : input.remark?.trim() || null,
      updatedAt: nowIso()
    });

    if (!changed) {
      throw new AppError("USER_UPDATE_FAILED", "failed to update user", 500);
    }

    const latest = this.getById(id);
    this.authService.syncUserLoginAccount({
      userId: id,
      username: latest.username,
      nickname: latest.displayName || latest.username,
      status: latest.status === "active" ? "active" : "disabled"
    });

    return this.getById(id);
  }

  enableLoginAccount(input: EnableUserLoginAccountInput): UserEntity {
    const user = this.getById(input.userId);
    const existing = this.authService.getUserLoginAccountByUserId(input.userId);

    if (existing) {
      this.authService.enableUserLoginAccountByUserId(input.userId, {
        username: input.username,
        nickname: user.displayName || user.username,
        status: user.status === "active" ? "active" : "disabled"
      });
      return this.getById(input.userId);
    }

    if (!input.password?.trim()) {
      throw new AppError("AUTH_PASSWORD_REQUIRED", "password is required to open login account", 400);
    }

    this.authService.createUserLoginAccount({
      userId: input.userId,
      username: input.username?.trim() || user.username,
      nickname: user.displayName || user.username,
      status: user.status === "active" ? "active" : "disabled",
      role: "user",
      password: input.password,
      mustChangePassword: input.mustChangePassword ?? true
    });

    return this.getById(input.userId);
  }

  disableLoginAccount(userId: string): UserEntity {
    this.getById(userId);
    this.authService.disableUserLoginAccountByUserId(userId);
    return this.getById(userId);
  }

  resetPassword(input: ResetUserPasswordInput): void {
    const user = this.getById(input.userId);
    this.authService.resetUserPasswordByUserId(
      input.userId,
      {
        newPassword: input.newPassword,
        mustChangePassword: input.mustChangePassword ?? true
      },
      {
        username: user.username,
        nickname: user.displayName || user.username,
        status: user.status === "active" ? "active" : "disabled"
      }
    );
  }

  private ensureUsernameUnique(username: string, excludeId?: string): void {
    const existing = this.repo.findByUsername(username);
    if (existing && existing.id !== excludeId) {
      throw new AppError("USER_USERNAME_EXISTS", `username already exists: ${username}`, 409);
    }
  }

  private handleSqliteError(error: unknown, username: string): never {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new AppError("USER_USERNAME_EXISTS", `username already exists: ${username}`, 409);
    }

    throw error;
  }
}
