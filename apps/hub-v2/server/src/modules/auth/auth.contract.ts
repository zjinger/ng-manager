import type { RequestContext } from "../../shared/context/request-context";
import type { AdminProfile, ChangePasswordInput, LoginChallenge, LoginInput, UpdateAvatarInput } from "./auth.types";

export interface AuthCommandContract {
  issueLoginChallenge(): LoginChallenge;
  login(input: LoginInput, ctx: RequestContext): Promise<AdminProfile>;
  changePassword(input: ChangePasswordInput, ctx: RequestContext): Promise<AdminProfile>;
  updateAvatar(input: UpdateAvatarInput, ctx: RequestContext): Promise<AdminProfile>;
  logout(ctx: RequestContext): Promise<{ ok: true }>;
}

export interface AuthQueryContract {
  me(ctx: RequestContext): Promise<AdminProfile>;
}
