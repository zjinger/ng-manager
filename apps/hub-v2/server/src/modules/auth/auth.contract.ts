import type { RequestContext } from "../../shared/context/request-context";
import type {
  AdminProfile,
  ChangePasswordInput,
  LoginChallenge,
  LoginInput,
  UpdateAvatarInput,
  UpdateProfileInput
} from "./auth.types";

export interface AuthCommandContract {
  issueLoginChallenge(): LoginChallenge;
  issuePasswordChallenge(): LoginChallenge;
  login(input: LoginInput, ctx: RequestContext): Promise<AdminProfile>;
  changePassword(input: ChangePasswordInput, ctx: RequestContext): Promise<AdminProfile>;
  updateAvatar(input: UpdateAvatarInput, ctx: RequestContext): Promise<AdminProfile>;
  updateProfile(input: UpdateProfileInput, ctx: RequestContext): Promise<AdminProfile>;
  logout(ctx: RequestContext): Promise<{ ok: true }>;
}

export interface AuthQueryContract {
  me(ctx: RequestContext): Promise<AdminProfile>;
}
