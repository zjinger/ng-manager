export interface AuthUser {
  id: string;
  userId: string | null;
  username: string;
  email: string | null;
  mobile: string | null;
  remark: string | null;
  nickname: string;
  avatarUploadId: string | null;
  avatarUrl: string | null;
  role: string;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginChallenge {
  nonce: string;
  expiresAt: string;
}
