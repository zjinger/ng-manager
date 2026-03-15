import { createDecipheriv, createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { env } from "../../env";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import { UploadService } from "../upload/upload.service";
import type { UploadEntity } from "../upload/upload.types";
import { UserRepo } from "../user/user.repo";
import type { UserEntity } from "../user/user.types";
import type {
    AdminAccountProfile,
    AdminUserEntity,
    AdminUserProfile,
    AdminUserRole,
    ChangePasswordInput,
    LoginChallenge,
    LoginInput,
    ResetPasswordInput,
    UpdateAdminAccountProfileInput
} from "./auth.types";
import { AuthRepo } from "./auth.repo";

interface ChallengeState {
    expiresAt: number;
}

interface UploadAvatarInput {
    originalName: string;
    mimeType?: string | null;
    fileSize: number;
    tempFilePath: string;
}

export class AuthService {
    private readonly challenges = new Map<string, ChallengeState>();

    constructor(
        private readonly repo: AuthRepo,
        private readonly userRepo: UserRepo,
        private readonly uploadService: UploadService
    ) { }

    async ensureDefaultAdmin(): Promise<void> {
        const total = this.repo.countAdmins();
        if (total > 0) return;

        const now = nowIso();
        const passwordHash = await bcrypt.hash(env.initAdminPassword, 10);

        const entity: AdminUserEntity = {
            id: genId("adm"),
            userId: null,
            username: env.initAdminUsername.trim(),
            passwordHash,
            nickname: env.initAdminNickname.trim() || null,
            avatarUploadId: null,
            status: "active",
            role: "admin",
            mustChangePassword: true,
            lastLoginAt: null,
            createdAt: now,
            updatedAt: now
        };

        try {
            this.repo.create(entity);
        } catch (error) {
            if (
                error instanceof Database.SqliteError &&
                error.code === "SQLITE_CONSTRAINT_UNIQUE"
            ) {
                return;
            }
            throw error;
        }
    }

    issueLoginChallenge(): LoginChallenge {
        this.cleanupChallenges();

        const nonce = randomUUID();
        const expiresAt = Date.now() + env.loginChallengeTtlMs;

        this.challenges.set(nonce, { expiresAt });

        return {
            nonce,
            expiresAt: new Date(expiresAt).toISOString()
        };
    }

    async login(input: LoginInput): Promise<AdminUserProfile> {
        const username = input.username.trim();
        const user = this.repo.findByUsername(username);

        if (!user) {
            throw new AppError("AUTH_INVALID_CREDENTIALS", "用户名或密码错误", 401);
        }

        if (user.status !== "active") {
            throw new AppError("AUTH_USER_DISABLED", "用户已被禁用", 403);
        }

        const rawPassword = this.resolvePassword(input);

        const matched = await bcrypt.compare(rawPassword, user.passwordHash);
        if (!matched) {
            throw new AppError("AUTH_INVALID_CREDENTIALS", "用户名或密码错误", 401);
        }

        const now = nowIso();
        this.repo.updateLastLoginAt(user.id, now, now);

        return this.getProfileById(user.id);
    }

    getProfileById(id: string): AdminUserProfile {
        const user = this.repo.findById(id);
        if (!user) {
            throw new AppError("AUTH_USER_NOT_FOUND", `admin user not found: ${id}`, 401);
        }

        if (user.status !== "active") {
            throw new AppError("AUTH_USER_DISABLED", "admin user is disabled", 403);
        }

        return this.toProfile(user);
    }

    getAccountProfile(adminUserId: string): AdminAccountProfile {
        const adminUser = this.requireActiveAdminUser(adminUserId);
        const linkedUser = adminUser.userId ? this.userRepo.findById(adminUser.userId) : null;
        return this.toAccountProfile(adminUser, linkedUser);
    }

    updateAccountProfile(adminUserId: string, input: UpdateAdminAccountProfileInput): AdminAccountProfile {
        const adminUser = this.requireActiveAdminUser(adminUserId);
        const linkedUser = adminUser.userId ? this.userRepo.findById(adminUser.userId) : null;
        const updatedAt = nowIso();
        const displayName = this.normalizeRequired(input.displayName, "AUTH_DISPLAY_NAME_REQUIRED", "姓名不能为空");
        const email = this.normalizeOptional(input.email);
        const mobile = this.normalizeOptional(input.mobile);
        const bio = this.normalizeOptional(input.bio);

        if (linkedUser) {
            const changed = this.userRepo.update(linkedUser.id, {
                displayName,
                email,
                mobile,
                remark: bio,
                updatedAt
            });
            if (!changed) {
                throw new AppError("AUTH_PROFILE_UPDATE_FAILED", "更新个人资料失败", 500);
            }
        }

        const adminChanged = this.repo.updateById(adminUser.id, {
            nickname: displayName,
            updatedAt
        });
        if (!adminChanged) {
            throw new AppError("AUTH_PROFILE_UPDATE_FAILED", "更新个人资料失败", 500);
        }

        return this.getAccountProfile(adminUser.id);
    }

    uploadAccountAvatar(adminUserId: string, file: UploadAvatarInput): AdminAccountProfile {
        const adminUser = this.requireActiveAdminUser(adminUserId);
        if (!fs.existsSync(file.tempFilePath)) {
            throw new AppError("AUTH_AVATAR_FILE_NOT_FOUND", "未找到上传文件", 400);
        }

        const upload = this.uploadService.createLocalUpload({
            category: "avatar",
            originalName: file.originalName,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            tempFilePath: file.tempFilePath,
            storageDir: path.join(env.uploadRoot, "avatars", adminUser.id),
            visibility: "private",
            uploaderId: adminUser.userId ?? adminUser.id,
            uploaderName: adminUser.nickname?.trim() || adminUser.username
        });

        const previousAvatarId = adminUser.avatarUploadId ?? null;
        const updatedAt = nowIso();
        const changed = this.repo.updateById(adminUser.id, {
            avatarUploadId: upload.id,
            updatedAt
        });
        if (!changed) {
            this.uploadService.softDelete(upload.id);
            this.uploadService.deleteLocalFile(upload);
            throw new AppError("AUTH_AVATAR_UPDATE_FAILED", "更新头像失败", 500);
        }

        this.removeOldAvatar(previousAvatarId, upload.id);
        return this.getAccountProfile(adminUser.id);
    }

    clearAccountAvatar(adminUserId: string): AdminAccountProfile {
        const adminUser = this.requireActiveAdminUser(adminUserId);
        const previousAvatarId = adminUser.avatarUploadId ?? null;
        const changed = this.repo.updateById(adminUser.id, {
            avatarUploadId: null,
            updatedAt: nowIso()
        });
        if (!changed) {
            throw new AppError("AUTH_AVATAR_UPDATE_FAILED", "恢复默认头像失败", 500);
        }

        this.removeOldAvatar(previousAvatarId, null);
        return this.getAccountProfile(adminUser.id);
    }

    getAccountAvatar(adminUserId: string): UploadEntity {
        const adminUser = this.requireActiveAdminUser(adminUserId);
        if (!adminUser.avatarUploadId) {
            throw new AppError("AUTH_AVATAR_NOT_FOUND", "未设置个人头像", 404);
        }

        const upload = this.uploadService.getById(adminUser.avatarUploadId);
        if (upload.status !== "active") {
            throw new AppError("AUTH_AVATAR_NOT_FOUND", "未设置个人头像", 404);
        }
        return upload;
    }

    isAdminUser(adminUserId: string): boolean {
        const user = this.repo.findById(adminUserId);
        return !!user && user.status === "active" && user.role === "admin";
    }

    createUserLoginAccount(input: {
        userId: string;
        username: string;
        nickname?: string | null;
        status?: "active" | "disabled";
        role?: AdminUserRole;
        password: string;
        mustChangePassword?: boolean;
    }): void {
        const username = input.username.trim();
        if (!username) {
            throw new AppError("AUTH_USERNAME_REQUIRED", "login username is required", 400);
        }

        if (this.repo.findByUserId(input.userId)) {
            throw new AppError("AUTH_LOGIN_ACCOUNT_EXISTS", "login account already exists", 409);
        }

        if (this.repo.findByUsername(username)) {
            throw new AppError("AUTH_USERNAME_EXISTS", `login username already exists: ${username}`, 409);
        }

        const passwordHash = bcrypt.hashSync(input.password, 10);
        const now = nowIso();

        const entity: AdminUserEntity = {
            id: genId("adm"),
            userId: input.userId,
            username,
            passwordHash,
            nickname: input.nickname ?? null,
            avatarUploadId: null,
            status: input.status ?? "active",
            role: input.role ?? "user",
            mustChangePassword: input.mustChangePassword ?? true,
            lastLoginAt: null,
            createdAt: now,
            updatedAt: now
        };

        this.repo.create(entity);
    }

    getUserLoginAccountByUserId(userId: string): AdminUserProfile | null {
        const user = this.repo.findByUserId(userId);
        return user ? this.toProfile(user) : null;
    }

    enableUserLoginAccountByUserId(userId: string, input: {
        username?: string;
        nickname?: string | null;
        status?: "active" | "disabled";
    }): void {
        const existing = this.repo.findByUserId(userId);
        if (!existing) {
            throw new AppError("AUTH_USER_NOT_FOUND", "login account not found", 404);
        }

        const nextUsername = input.username?.trim();
        if (nextUsername && nextUsername.toLowerCase() !== existing.username.toLowerCase()) {
            const duplicated = this.repo.findByUsername(nextUsername);
            if (duplicated && duplicated.id !== existing.id) {
                throw new AppError("AUTH_USERNAME_EXISTS", `login username already exists: ${nextUsername}`, 409);
            }
        }

        this.repo.updateByUserId(userId, {
            username: nextUsername,
            nickname: input.nickname,
            status: input.status ?? "active",
            updatedAt: nowIso()
        });
    }

    disableUserLoginAccountByUserId(userId: string): void {
        const existing = this.repo.findByUserId(userId);
        if (!existing) {
            throw new AppError("AUTH_USER_NOT_FOUND", "login account not found", 404);
        }

        this.repo.updateByUserId(userId, {
            status: "disabled",
            updatedAt: nowIso()
        });
    }

    syncUserLoginAccount(input: {
        userId: string;
        username?: string;
        nickname?: string | null;
        status?: "active" | "disabled";
    }): void {
        const existing = this.repo.findByUserId(input.userId);
        if (!existing) {
            return;
        }

        const nextStatus = input.status === "disabled" ? "disabled" : existing.status;

        this.repo.updateByUserId(input.userId, {
            username: input.username,
            nickname: input.nickname,
            status: nextStatus,
            updatedAt: nowIso()
        });
    }

    resetUserPasswordByUserId(
        userId: string,
        input: ResetPasswordInput,
        seed?: {
            username: string;
            nickname?: string | null;
            status?: "active" | "disabled";
        }
    ): void {
        const existing = this.repo.findByUserId(userId);
        if (!existing) {
            if (!seed) {
                throw new AppError("AUTH_USER_NOT_FOUND", "账户未找到", 404);
            }

            this.createUserLoginAccount({
                userId,
                username: seed.username,
                nickname: seed.nickname ?? null,
                status: seed.status ?? "active",
                password: input.newPassword,
                mustChangePassword: input.mustChangePassword ?? true
            });
            return;
        }

        const passwordHash = bcrypt.hashSync(input.newPassword, 10);
        const changed = this.repo.updatePassword(
            existing.id,
            passwordHash,
            input.mustChangePassword ?? true,
            nowIso()
        );

        if (!changed) {
            throw new AppError("AUTH_PASSWORD_CHANGE_FAILED", "重置密码失败", 500);
        }
    }

    async changePassword(adminUserId: string, input: ChangePasswordInput): Promise<AdminUserProfile> {
        const user = this.repo.findById(adminUserId);
        if (!user) {
            throw new AppError("AUTH_USER_NOT_FOUND", `admin 用户未找到: ${adminUserId}`, 401);
        }

        if (user.status !== "active") {
            throw new AppError("AUTH_USER_DISABLED", "admin 用户已被禁用", 403);
        }

        const matched = await bcrypt.compare(input.oldPassword, user.passwordHash);
        if (!matched) {
            throw new AppError("AUTH_INVALID_OLD_PASSWORD", "旧密码不正确", 400);
        }

        if (input.oldPassword === input.newPassword) {
            throw new AppError("AUTH_PASSWORD_NOT_CHANGED", "新密码必须与旧密码不同", 400);
        }

        const passwordHash = bcrypt.hashSync(input.newPassword, 10);
        const changed = this.repo.updatePassword(user.id, passwordHash, false, nowIso());

        if (!changed) {
            throw new AppError("AUTH_PASSWORD_CHANGE_FAILED", "修改密码失败", 500);
        }

        return this.getProfileById(user.id);
    }

    private requireActiveAdminUser(adminUserId: string): AdminUserEntity {
        const adminUser = this.repo.findById(adminUserId);
        if (!adminUser) {
            throw new AppError("AUTH_USER_NOT_FOUND", "账户未找到", 404);
        }
        if (adminUser.status !== "active") {
            throw new AppError("AUTH_USER_DISABLED", "账户已被禁用", 403);
        }
        return adminUser;
    }

    private removeOldAvatar(previousAvatarId: string | null, nextAvatarId: string | null): void {
        if (!previousAvatarId || previousAvatarId === nextAvatarId) {
            return;
        }

        try {
            const previous = this.uploadService.getById(previousAvatarId);
            this.uploadService.softDelete(previousAvatarId);
            this.uploadService.deleteLocalFile(previous);
        } catch {
            // 旧头像清理失败不阻断主流程
        }
    }

    private toAccountProfile(adminUser: AdminUserEntity, linkedUser: UserEntity | null): AdminAccountProfile {
        const displayName = linkedUser?.displayName?.trim() || adminUser.nickname?.trim() || adminUser.username;
        return {
            id: adminUser.id,
            userId: adminUser.userId ?? null,
            username: adminUser.username,
            displayName,
            email: linkedUser?.email ?? null,
            mobile: linkedUser?.mobile ?? null,
            bio: linkedUser?.remark ?? null,
            role: adminUser.role,
            roleLabel: this.getRoleLabel(adminUser.role),
            avatarUploadId: adminUser.avatarUploadId ?? null,
            avatarUrl: this.buildAvatarUrl(adminUser),
            createdAt: adminUser.createdAt,
            updatedAt: linkedUser?.updatedAt ?? adminUser.updatedAt
        };
    }

    private getRoleLabel(role: AdminUserRole): string {
        return role === "admin" ? "管理员" : "普通成员";
    }

    private buildAvatarUrl(user: AdminUserEntity): string | null {
        if (!user.avatarUploadId) {
            return null;
        }
        return "/api/admin/auth/avatar";
    }

    private normalizeOptional(value?: string | null): string | null | undefined {
        if (value === undefined) {
            return undefined;
        }
        if (value === null) {
            return null;
        }
        const next = value.trim();
        return next ? next : null;
    }

    private normalizeRequired(value: string | null | undefined, code: string, message: string): string {
        const next = value?.trim() || "";
        if (!next) {
            throw new AppError(code, message, 400);
        }
        return next;
    }

    private resolvePassword(input: LoginInput): string {
        if ("password" in input) {
            return input.password;
        }

        const nonceState = this.challenges.get(input.nonce);
        this.challenges.delete(input.nonce);

        if (!nonceState) {
            throw new AppError("AUTH_CHALLENGE_INVALID", "登录无效", 401);
        }

        if (Date.now() > nonceState.expiresAt) {
            throw new AppError("AUTH_CHALLENGE_EXPIRED", "登录已过期", 401);
        }

        const decoded = this.decryptLoginPassword(input.iv, input.cipherText);
        const prefix = `${input.nonce}:`;
        if (!decoded.startsWith(prefix)) {
            throw new AppError("AUTH_CHALLENGE_INVALID", "登录无效", 401);
        }

        return decoded.slice(prefix.length);
    }

    /**
     * GCM 模式解密，兼容之前版本加密的密码，新的加密方式改为 CBC 模式，原因是浏览器端 CryptoJS 的 GCM 模式在某些环境（如 Safari）存在兼容性问题，导致无法正确解密密码。
     */
    private decryptLoginPassword2(ivBase64: string, cipherTextBase64: string): string {
        try {
            const iv = Buffer.from(ivBase64, "base64");
            const encrypted = Buffer.from(cipherTextBase64, "base64");

            if (iv.length !== 12 || encrypted.length <= 16) {
                throw new Error("invalid cipher payload");
            }

            const key = createHash("sha256").update(env.loginAesKey, "utf8").digest();
            const authTag = encrypted.subarray(encrypted.length - 16);
            const data = encrypted.subarray(0, encrypted.length - 16);

            const decipher = createDecipheriv("aes-256-gcm", key, iv);
            decipher.setAuthTag(authTag);

            const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");

            if (plain.length === 0) {
                throw new Error("empty plain password");
            }

            return plain;
        } catch {
            throw new AppError("AUTH_INVALID_ENCRYPTED_PASSWORD", "无效的加密密码", 401);
        }
    }

    /**
     *  CBC 模式解密，兼容新的加密方式
     */
    private decryptLoginPassword(ivBase64: string, cipherTextBase64: string): string {
        try {
            const iv = Buffer.from(ivBase64, "base64");
            const encrypted = Buffer.from(cipherTextBase64, "base64");

            if (iv.length !== 16 || encrypted.length === 0) {
                throw new Error("invalid cipher payload");
            }

            const key = createHash("sha256")
                .update(env.loginAesKey, "utf8")
                .digest();

            const decipher = createDecipheriv("aes-256-cbc", key, iv);
            decipher.setAutoPadding(true);

            const plain = Buffer.concat([
                decipher.update(encrypted),
                decipher.final()
            ]).toString("utf8");

            if (!plain) {
                throw new Error("empty plain password");
            }

            return plain;
        } catch {
            throw new AppError("AUTH_INVALID_ENCRYPTED_PASSWORD", "无效的加密密码", 401);
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

    private toProfile(user: AdminUserEntity): AdminUserProfile {
        return {
            id: user.id,
            userId: user.userId ?? null,
            username: user.username,
            nickname: user.nickname,
            avatarUploadId: user.avatarUploadId ?? null,
            avatarUrl: this.buildAvatarUrl(user),
            status: user.status,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }
}

