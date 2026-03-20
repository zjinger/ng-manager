export type AdminAccountRole = "admin" | "user";
export type AdminAccountStatus = "active" | "inactive";

export interface AdminAccountEntity {
  id: string;
  userId?: string | null;
  username: string;
  passwordHash: string;
  nickname: string;
  role: AdminAccountRole;
  status: AdminAccountStatus;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProfile {
  id: string;
  userId?: string | null;
  username: string;
  nickname: string;
  role: AdminAccountRole;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginChallenge {
  nonce: string;
  expiresAt: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}
