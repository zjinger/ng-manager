export interface AdminProfile {
  id: string;
  userId: string | null;
  username: string;
  email: string | null;
  mobile: string | null;
  nickname: string;
  avatarUploadId: string | null;
  avatarUrl: string | null;
  role: 'admin' | 'user';
  department: { id: string; code: string; name: string } | null;
  systemRoles: { id: string; code: string; name: string }[];
  permissionCodes: string[];
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginChallenge {
  nonce: string;
  expiresAt: string;
  publicKey: string;
}

export interface LoginRequest {
  username: string;
  nonce: string;
  cipherText: string;
  remember?: boolean;
}

export interface ChangePasswordRequest {
  nonce: string;
  oldCipherText: string;
  newCipherText: string;
}
