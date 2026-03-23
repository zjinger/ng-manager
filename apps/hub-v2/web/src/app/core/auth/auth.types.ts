export interface AuthUser {
  id: string;
  userId: string | null;
  username: string;
  nickname: string;
  role: string;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  username: string;
  password: string;
}
