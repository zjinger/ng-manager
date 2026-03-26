import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreatePersonalApiTokenInput,
  CreatePersonalApiTokenResult,
  ListPersonalApiTokensResult,
  VerifyPersonalApiTokenResult
} from "./personal-token.types";

export interface PersonalTokenCommandContract {
  create(input: CreatePersonalApiTokenInput, ctx: RequestContext): Promise<CreatePersonalApiTokenResult>;
  revoke(tokenId: string, ctx: RequestContext): Promise<void>;
}

export interface PersonalTokenQueryContract {
  list(ctx: RequestContext): Promise<ListPersonalApiTokensResult>;
  verifyToken(rawToken: string): Promise<VerifyPersonalApiTokenResult | null>;
  resolveProjectId(projectKey: string): string;
}
