export interface HubAuthUser {
  id?: string;
  userId?: string | null;
  token: string;
  username?: string;
  nickname?: string;
  avatarUploadId?: string | null;
  avatarUrl?: string | null;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}
