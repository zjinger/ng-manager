export interface HubAuthUser {
  id?: string;
  userId?: string | null;
  tokenId?:string;
  token: string;
  username?: string;
  nickname?: string;
  scopes?: string[];
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}
