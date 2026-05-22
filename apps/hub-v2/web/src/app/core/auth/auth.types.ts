export interface AuthUser {
  id: string;
  userId: string | null;
  username: string;
  email: string | null;
  mobile: string | null;
  remark: string | null;
  titleCode: string | null;
  titleName: string | null;
  nickname: string;
  avatarUploadId: string | null;
  avatarUrl: string | null;
  role: string;
  department: AuthUserDepartment | null;
  systemRoles: AuthUserSystemRole[];
  permissionCodes: string[];
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUserDepartment {
  id: string;
  code: string;
  name: string;
}

export interface AuthUserSystemRole {
  id: string;
  code: string;
  name: string;
  purposeCode: string;
  purposeName: string;
}

export interface LoginInput {
  username: string;
  password: string;
  remember?: boolean;
}

export interface LoginChallenge {
  nonce: string;
  expiresAt: string;
  publicKey: string;
}
