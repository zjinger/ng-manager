export type AdminAccountRole = "admin" | "user";
export type AdminAccountStatus = "active" | "inactive";

export interface AdminAccountEntity {
  id: string;
  userId?: string | null;
  username: string;
  email?: string | null;
  mobile?: string | null;
  remark?: string | null;
  passwordHash: string;
  nickname: string;
  avatarUploadId?: string | null;
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
  email: string | null;
  mobile: string | null;
  remark: string | null;
  nickname: string;
  avatarUploadId: string | null;
  avatarUrl: string | null;
  role: AdminAccountRole;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginChallenge {
  nonce: string;
  expiresAt: string;
}

export interface EncryptedLoginInput {
  username: string;
  nonce: string;
  iv: string;
  cipherText: string;
}

export type LoginInput = EncryptedLoginInput;

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface UpdateAvatarInput {
  uploadId: string | null;
}
