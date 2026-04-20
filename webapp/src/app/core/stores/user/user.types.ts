export interface HubAuthUser {
  userId: string;
  tokenId: string;
  username?: string;
  nickname?: string;
  scopes: string[];
  role?: string;
}
