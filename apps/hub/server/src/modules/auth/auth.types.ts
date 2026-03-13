export type AdminUserStatus = "active" | "disabled";
export type AdminUserRole = "admin" | "user";

export interface AdminUserEntity {
    id: string;
    userId?: string | null;
    username: string;
    passwordHash: string;
    nickname?: string | null;
    status: AdminUserStatus;
    role: AdminUserRole;
    mustChangePassword: boolean;
    lastLoginAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdminUserProfile {
    id: string;
    userId?: string | null;
    username: string;
    nickname?: string | null;
    status: AdminUserStatus;
    role: AdminUserRole;
    mustChangePassword: boolean;
    lastLoginAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAdminUserInput {
    userId?: string;
    username: string;
    passwordHash: string;
    nickname?: string;
    role?: AdminUserRole;
    mustChangePassword?: boolean;
}

export interface EncryptedLoginInput {
    username: string;
    nonce: string;
    iv: string;
    cipherText: string;
}

export interface PlainLoginInput {
    username: string;
    password: string;
}

export type LoginInput = EncryptedLoginInput | PlainLoginInput;

export interface ChangePasswordInput {
    oldPassword: string;
    newPassword: string;
}

export interface ResetPasswordInput {
    newPassword: string;
    mustChangePassword?: boolean;
}

export interface JwtAdminPayload {
    sub: string;
    username: string;
}

export interface LoginChallenge {
    nonce: string;
    expiresAt: string;
}
