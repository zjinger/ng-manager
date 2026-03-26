export type PersonalTokenScope =
  | "issue:comment:write"
  | "issue:transition:write"
  | "issue:assign:write"
  | "issue:participant:write"
  | "rd:transition:write"
  | "rd:edit:write"
  | "rd:delete:write";

export type PersonalTokenStatus = "active" | "revoked";

export interface PersonalApiTokenEntity {
  id: string;
  ownerUserId: string;
  name: string;
  tokenPrefix: string;
  scopes: PersonalTokenScope[];
  status: PersonalTokenStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonalApiTokenInput {
  name: string;
  scopes: PersonalTokenScope[];
  expiresAt?: string | null;
}

export interface CreatePersonalApiTokenResult {
  token: string;
  entity: PersonalApiTokenEntity;
}

export interface ListPersonalApiTokensResult {
  items: PersonalApiTokenEntity[];
}

export interface VerifyPersonalApiTokenResult {
  tokenId: string;
  ownerUserId: string;
  scopes: PersonalTokenScope[];
}
