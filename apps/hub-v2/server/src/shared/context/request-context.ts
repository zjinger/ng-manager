export type RequestSource = "http" | "ws" | "cli" | "job";
export type RequestAuthType = "anonymous" | "user" | "token" | "public";

export interface RequestContext {
  accountId: string;
  nickname?: string | null;
  userId?: string | null;
  roles: string[];
  projectIds?: string[];
  authType: RequestAuthType;
  authScopes?: string[];
  tokenId?: string;
  source: RequestSource;
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

type CreateRequestContextInput = {
  accountId?: string;
  nickname?: string | null;
  userId?: string | null;
  roles?: string[];
  projectIds?: string[];
  authType?: RequestAuthType;
  authScopes?: string[];
  tokenId?: string;
  source: RequestSource;
  requestId?: string;
  ip?: string;
  userAgent?: string;
};

export function createRequestContext(input: CreateRequestContextInput): RequestContext {
  const accountId = input.accountId ?? "anonymous";
  const authType =
    input.authType ??
    (accountId === "anonymous" ? "anonymous" : accountId === "public" ? "public" : "user");

  return {
    accountId,
    nickname: input.nickname ?? null,
    userId: input.userId ?? null,
    roles: input.roles ?? [],
    projectIds: input.projectIds ?? [],
    authType,
    authScopes: input.authScopes ?? [],
    tokenId: input.tokenId,
    source: input.source,
    requestId: input.requestId,
    ip: input.ip,
    userAgent: input.userAgent
  };
}
