export type AdminUserStatus = "active" | "disabled";

export interface AdminUserEntity {
    id: string;
    username: string;
    passwordHash: string;
    nickname?: string | null;
    status: AdminUserStatus;
    mustChangePassword: boolean;
    lastLoginAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdminUserProfile {
    id: string;
    username: string;
    nickname?: string | null;
    status: AdminUserStatus;
    mustChangePassword: boolean;
    lastLoginAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAdminUserInput {
    username: string;
    passwordHash: string;
    nickname?: string;
    mustChangePassword?: boolean;
}

export interface LoginInput {
    username: string;
    password: string;
}

export interface ChangePasswordInput {
    oldPassword: string;
    newPassword: string;
}

export interface JwtAdminPayload {
    sub: string;
    username: string;
}
