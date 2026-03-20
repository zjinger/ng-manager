import type { AuthJwtPayload } from "./jwt-payload";

export interface CurrentAdmin extends AuthJwtPayload {
  nickname: string;
}
