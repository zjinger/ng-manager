import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { env } from "../../env";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import type {
    AdminUserEntity,
    AdminUserProfile,
    ChangePasswordInput,
    LoginInput
} from "./auth.types";
import { AuthRepo } from "./auth.repo";

export class AuthService {
    constructor(private readonly repo: AuthRepo) { }

    async ensureDefaultAdmin(): Promise<void> {
        const total = this.repo.countAdmins();
        if (total > 0) return;

        const now = nowIso();
        const passwordHash = await bcrypt.hash(env.initAdminPassword, 10);

        const entity: AdminUserEntity = {
            id: genId("adm"),
            username: env.initAdminUsername.trim(),
            passwordHash,
            nickname: env.initAdminNickname.trim() || null,
            status: "active",
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

    async login(input: LoginInput): Promise<AdminUserProfile> {
        const username = input.username.trim();
        const user = this.repo.findByUsername(username);

        if (!user) {
            throw new AppError("AUTH_INVALID_CREDENTIALS", "invalid username or password", 401);
        }

        if (user.status !== "active") {
            throw new AppError("AUTH_USER_DISABLED", "admin user is disabled", 403);
        }

        const matched = await bcrypt.compare(input.password, user.passwordHash);
        if (!matched) {
            throw new AppError("AUTH_INVALID_CREDENTIALS", "invalid username or password", 401);
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

    async changePassword(adminUserId: string, input: ChangePasswordInput): Promise<AdminUserProfile> {
        const user = this.repo.findById(adminUserId);
        if (!user) {
            throw new AppError("AUTH_USER_NOT_FOUND", `admin user not found: ${adminUserId}`, 401);
        }

        if (user.status !== "active") {
            throw new AppError("AUTH_USER_DISABLED", "admin user is disabled", 403);
        }

        const matched = await bcrypt.compare(input.oldPassword, user.passwordHash);
        if (!matched) {
            throw new AppError("AUTH_INVALID_OLD_PASSWORD", "old password is incorrect", 400);
        }

        if (input.oldPassword === input.newPassword) {
            throw new AppError("AUTH_PASSWORD_NOT_CHANGED", "new password must be different from old password", 400);
        }

        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        const changed = this.repo.updatePassword(user.id, passwordHash, false, nowIso());

        if (!changed) {
            throw new AppError("AUTH_PASSWORD_CHANGE_FAILED", "failed to change password", 500);
        }

        return this.getProfileById(user.id);
    }

    private toProfile(user: AdminUserEntity): AdminUserProfile {
        return {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            status: user.status,
            mustChangePassword: user.mustChangePassword,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }
}