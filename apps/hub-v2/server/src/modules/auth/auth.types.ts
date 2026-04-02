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
  publicKey: string;
}

export interface EncryptedLoginInput {
  username: string;
  nonce: string;
  cipherText: string;
}

export type LoginInput = EncryptedLoginInput;

export interface PlainChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface EncryptedChangePasswordInput {
  nonce: string;
  oldCipherText: string;
  newCipherText: string;
}

export type ChangePasswordInput = PlainChangePasswordInput | EncryptedChangePasswordInput;

export interface UpdateAvatarInput {
  uploadId: string | null;
}

export interface UpdateProfileInput {
  nickname: string;
  email: string | null;
  mobile: string | null;
  remark: string | null;
}
