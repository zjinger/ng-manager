export type PersonalTokenScope =
  | "issue:comment:write" // 评论权限
  | "issue:transition:write" // 流转权限
  | "issue:assign:write" // 分配权限
  | "issue:branch:write" // 协作分支权限
  | "issue:participant:write" // 参与者管理权限
  | "doc:create:write" // 文档创建权限
  | "doc:update:write" // 文档编辑权限
  | "doc:publish:write" // 文档发布权限
  | "rd:transition:write" // 需求流转权限
  | "rd:edit:write"; // 需求编辑权限

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
  tokenPrefix: string;
  ownerUserId: string;
  ownerNickname: string | null;
  scopes: PersonalTokenScope[];
}

export interface PersonalTokenIdentityResult {
  tokenId: string;
  userId: string;
  nickname: string | null;
  scopes: PersonalTokenScope[];
}

export interface PersonalProjectCapabilitiesResult {
  project: {
    id: string;
    key: string;
    name: string;
    status: "active" | "inactive";
    visibility: "internal" | "private";
  };
  actor: {
    userId: string;
    nickname: string | null;
    isProjectMember: boolean;
    memberRole: string | null;
    isOwner: boolean;
    isProjectAdmin: boolean;
  };
  scopes: {
    all: PersonalTokenScope[];
    issue: {
      canComment: boolean;
      canTransition: boolean;
      canAssign: boolean;
      canManageBranches: boolean;
      canManageParticipants: boolean;
    };
    rd: {
      canTransition: boolean;
      canEdit: boolean;
    };
    docs: {
      canCreate: boolean;
      canUpdate: boolean;
      canPublish: boolean;
    };
  };
  writable: boolean;
  readOnlyReason: string | null;
}
