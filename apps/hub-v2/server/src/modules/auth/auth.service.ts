import { randomUUID } from "node:crypto";
import type { AppConfig } from "../../shared/env/env";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { RequestContext } from "../../shared/context/request-context";
import { genId } from "../../shared/utils/id";
import { hashPassword, verifyPassword } from "../../shared/utils/password";
import { nowIso } from "../../shared/utils/time";
import { AuthRepo } from "./auth.repo";
import type { AuthCommandContract, AuthQueryContract } from "./auth.contract";
import type {
  AdminAccountEntity,
  AdminProfile,
  ChangePasswordInput,
  LoginChallenge,
  LoginInput
} from "./auth.types";

export class AuthService implements AuthCommandContract, AuthQueryContract {
  constructor(
    private readonly config: AppConfig,
    private readonly repo: AuthRepo
  ) {}

  issueLoginChallenge(): LoginChallenge {
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    return {
      nonce: randomUUID(),
      expiresAt
    };
  }

  async login(input: LoginInput, _ctx: RequestContext): Promise<AdminProfile> {
    const username = input.username.trim();
    const password = input.password;
    const account = this.repo.findByUsername(username);

    if (!account || account.status !== "active" || !verifyPassword(password, account.passwordHash)) {
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "invalid username or password", 401);
    }

    const now = nowIso();
    this.repo.updateLastLogin(account.id, now);

    return this.toProfile({
      ...account,
      lastLoginAt: now,
      updatedAt: now
    });
  }

  async me(ctx: RequestContext): Promise<AdminProfile> {
    const account = this.repo.findById(ctx.accountId);
    if (!account || account.status !== "active") {
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "unauthorized", 401);
    }

    return this.toProfile(account);
  }

  async changePassword(input: ChangePasswordInput, ctx: RequestContext): Promise<AdminProfile> {
    const account = this.repo.findById(ctx.accountId);
    if (!account || account.status !== "active") {
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "unauthorized", 401);
    }

    if (!verifyPassword(input.oldPassword, account.passwordHash)) {
      throw new AppError("AUTH_PASSWORD_INVALID", "old password is invalid", 400);
    }

    const updatedAt = nowIso();
    this.repo.updatePassword(account.id, hashPassword(input.newPassword), updatedAt);

    return this.toProfile({
      ...account,
      mustChangePassword: false,
      updatedAt
    });
  }

  async logout(_ctx: RequestContext): Promise<{ ok: true }> {
    return { ok: true };
  }

  ensureDefaultAdmin(): void {
    const existing = this.repo.findByUsername(this.config.initAdminUsername);
    if (existing) {
      return;
    }

    const now = nowIso();
    this.repo.create({
      id: genId("adm"),
      userId: null,
      username: this.config.initAdminUsername,
      passwordHash: hashPassword(this.config.initAdminPassword),
      nickname: this.config.initAdminNickname,
      role: "admin",
      status: "active",
      mustChangePassword: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now
    });
  }

  private toProfile(account: AdminAccountEntity): AdminProfile {
    return {
      id: account.id,
      userId: account.userId ?? null,
      username: account.username,
      nickname: account.nickname,
      role: account.role,
      mustChangePassword: account.mustChangePassword,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };
  }
}
