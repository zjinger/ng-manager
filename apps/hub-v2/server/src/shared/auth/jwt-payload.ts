export interface AuthJwtPayload {
  accountId: string;
  username: string;
  role: "admin" | "user";
  userId?: string | null;
}
