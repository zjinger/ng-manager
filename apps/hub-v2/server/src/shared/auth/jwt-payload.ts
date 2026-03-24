export interface AuthJwtPayload {
  accountId: string;
  username: string;
  nickname?: string | null;
  role: "admin" | "user";
  userId?: string | null;
}
