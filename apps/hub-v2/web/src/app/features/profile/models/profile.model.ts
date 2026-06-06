import type { AuthUser } from '@core/auth';

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface UpdateProfileInput {
  nickname: string;
  email: string | null;
  mobile: string | null;
  remark: string | null;
}

export interface ProfileViewModel {
  user: AuthUser | null;
  initials: string;
}

export interface ProfileNotificationPrefs {
  channels: Record<string, boolean>;
  events: Record<string, boolean>;
  projectScopeMode: 'all_accessible' | 'member_only';
  includeArchivedProjects: boolean;
  updatedAt: string;
}

export interface ProfileActivityRecord {
  id: string;
  kind: 'issue_activity' | 'rd_activity';
  code: string;
  title: string;
  action: string;
  summary: string | null;
  createdAt: string;
  projectId: string;
  projectName: string;
}

export type PersonalTokenScope =
  | 'issue:create:write'
  | 'issue:update:write'
  | 'issue:comment:write'
  | 'issue:transition:write'
  | 'issue:assign:write'
  | 'issue:branch:write'
  | 'issue:participant:write'
  | 'doc:create:write'
  | 'doc:update:write'
  | 'doc:publish:write'
  | 'rd:create:write'
  | 'rd:progress:write'
  | 'rd:stage-task:write'
  | 'rd:transition:write'
  | 'rd:edit:write';

export type PersonalTokenStatus = 'active' | 'revoked';

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

export interface PersonalApiTokenAuditLogItem {
  id: string;
  tokenType: 'personal' | 'project';
  tokenId: string;
  tokenName: string | null;
  tokenPrefix: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  projectKey: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface PersonalApiTokenAuditLogQuery {
  page?: number;
  pageSize?: number;
  tokenId?: string;
  action?: string;
  projectKey?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PersonalApiTokenAuditLogResult {
  items: PersonalApiTokenAuditLogItem[];
  page: number;
  pageSize: number;
  total: number;
}
