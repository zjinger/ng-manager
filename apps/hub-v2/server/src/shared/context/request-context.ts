export type RequestSource = "http" | "ws" | "cli" | "job";

export interface RequestContext {
  accountId: string;
  nickname?: string | null;
  userId?: string | null;
  roles: string[];
  projectIds?: string[];
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
  source: RequestSource;
  requestId?: string;
  ip?: string;
  userAgent?: string;
};

export function createRequestContext(input: CreateRequestContextInput): RequestContext {
  return {
    accountId: input.accountId ?? "anonymous",
    nickname: input.nickname ?? null,
    userId: input.userId ?? null,
    roles: input.roles ?? [],
    projectIds: input.projectIds ?? [],
    source: input.source,
    requestId: input.requestId,
    ip: input.ip,
    userAgent: input.userAgent
  };
}
