import { constants, createDecipheriv, createHash, privateDecrypt, randomUUID } from "node:crypto";
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
  LoginInput,
  UpdateAvatarInput
} from "./auth.types";

const LOGIN_AES_KEY_SALT = "ngm_hub_v2_login_key_v1";
const LOGIN_AES_IV_SALT = "ngm_hub_v2_login_iv_v1";

export class AuthService implements AuthCommandContract, AuthQueryContract {
  private readonly challenges = new Map<string, { expiresAt: number }>();
  private readonly loginRsaPrivateKey: string;
  private readonly loginRsaPublicKey: string;

  constructor(
    private readonly config: AppConfig,
    private readonly repo: AuthRepo
  ) {
    this.loginRsaPrivateKey = this.normalizeRsaKey(config.loginRsaPrivateKey, "private");
    this.loginRsaPublicKey = this.normalizeRsaKey(config.loginRsaPublicKey, "public");
  }

  issueLoginChallenge(): LoginChallenge {
    this.cleanupChallenges();
    const nonce = randomUUID();
    const expiresAtMs = Date.now() + this.config.loginChallengeTtlMs;
    this.challenges.set(nonce, { expiresAt: expiresAtMs });
    return {
      nonce,
      expiresAt: new Date(expiresAtMs).toISOString(),
      publicKey: this.loginRsaPublicKey
    };
  }

  async login(input: LoginInput, _ctx: RequestContext): Promise<AdminProfile> {
    const username = input.username.trim();
    const password = this.resolvePassword(input);
    return this.loginByPassword(username, password);
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
      throw new AppError(ERROR_CODES.AUTH_PASSWORD_INVALID, "old password is invalid", 400);
    }

    const updatedAt = nowIso();
    this.repo.updatePassword(account.id, hashPassword(input.newPassword), updatedAt);

    return this.toProfile({
      ...account,
      mustChangePassword: false,
      updatedAt
    });
  }

  async updateAvatar(input: UpdateAvatarInput, ctx: RequestContext): Promise<AdminProfile> {
    const account = this.repo.findById(ctx.accountId);
    if (!account || account.status !== "active") {
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "unauthorized", 401);
    }
    const updatedAt = nowIso();
    this.repo.updateAvatar(account.id, input.uploadId?.trim() || null, updatedAt);
    return this.toProfile({
      ...account,
      avatarUploadId: input.uploadId?.trim() || null,
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
      email: account.email ?? null,
      mobile: account.mobile ?? null,
      remark: account.remark ?? null,
      nickname: account.nickname,
      avatarUploadId: account.avatarUploadId ?? null,
      avatarUrl: account.avatarUploadId ? `/api/admin/uploads/${account.avatarUploadId}/raw` : null,
      role: account.role,
      mustChangePassword: account.mustChangePassword,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };
  }

  private loginByPassword(username: string, password: string): AdminProfile {
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

  private resolvePassword(input: LoginInput): string {
    const nonceState = this.challenges.get(input.nonce);
    this.challenges.delete(input.nonce);

    if (!nonceState) {
      throw new AppError(ERROR_CODES.AUTH_CHALLENGE_INVALID, "login challenge is invalid", 401);
    }

    if (Date.now() > nonceState.expiresAt) {
      throw new AppError(ERROR_CODES.AUTH_CHALLENGE_EXPIRED, "login challenge has expired", 401);
    }

    const decrypted = this.decryptLoginPassword(input.cipherText, input.nonce);
    const expectedPrefix = `${input.nonce}:`;
    if (!decrypted.startsWith(expectedPrefix)) {
      throw new AppError(ERROR_CODES.AUTH_CHALLENGE_INVALID, "login challenge is invalid", 401);
    }

    return decrypted.slice(expectedPrefix.length);
  }

  private decryptLoginPassword(cipherTextBase64: string, nonce: string): string {
    const aesPlain = this.decryptLoginPasswordByAes(cipherTextBase64, nonce);
    if (aesPlain) {
      return aesPlain;
    }

    return this.decryptLoginPasswordByRsa(cipherTextBase64);
  }

  private decryptLoginPasswordByAes(cipherTextBase64: string, nonce: string): string | null {
    try {
      const key = createHash("sha256").update(`${nonce}:${LOGIN_AES_KEY_SALT}`).digest();
      const iv = createHash("sha256").update(`${nonce}:${LOGIN_AES_IV_SALT}`).digest().subarray(0, 16);
      const decipher = createDecipheriv("aes-256-cbc", key, iv);
      const plain = Buffer.concat([
        decipher.update(cipherTextBase64, "base64"),
        decipher.final()
      ]).toString("utf8");
      return plain || null;
    } catch {
      return null;
    }
  }

  private decryptLoginPasswordByRsa(cipherTextBase64: string): string {
    try {
      const encrypted = Buffer.from(cipherTextBase64, "base64");

      if (encrypted.length === 0) {
        throw new Error("invalid cipher payload");
      }

      const plain = privateDecrypt(
        {
          key: this.loginRsaPrivateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256"
        },
        encrypted
      ).toString("utf8");
      if (!plain) {
        throw new Error("empty plain password");
      }

      return plain;
    } catch {
      throw new AppError(ERROR_CODES.AUTH_INVALID_ENCRYPTED_PASSWORD, "invalid encrypted password", 401);
    }
  }

  private normalizeRsaKey(value: string, keyType: "private" | "public"): string {
    const direct = value.replace(/\\n/g, "\n").trim();
    if (this.isPemKey(direct)) {
      return direct;
    }

    const decoded = this.decodeBase64ToUtf8(value);
    if (decoded) {
      const normalizedDecoded = decoded.replace(/\\n/g, "\n").trim();
      if (this.isPemKey(normalizedDecoded)) {
        return normalizedDecoded;
      }
    }

    throw new Error(`[auth] invalid LOGIN_RSA_${keyType.toUpperCase()}_KEY format`);
  }

  private isPemKey(value: string): boolean {
    return value.includes("-----BEGIN") && value.includes("-----END");
  }

  private decodeBase64ToUtf8(value: string): string | null {
    try {
      return Buffer.from(value.trim(), "base64").toString("utf8");
    } catch {
      return null;
    }
  }

  private cleanupChallenges(): void {
    const now = Date.now();
    for (const [nonce, state] of this.challenges.entries()) {
      if (state.expiresAt <= now) {
        this.challenges.delete(nonce);
      }
    }
  }
}
