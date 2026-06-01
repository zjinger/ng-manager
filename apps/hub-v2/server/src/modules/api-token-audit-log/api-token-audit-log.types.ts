export type ApiTokenAuditLogTokenType = "project" | "personal";

export interface ApiTokenAuditLogEntity {
  id: string;
  tokenType: ApiTokenAuditLogTokenType;
  tokenId: string;
  actorUserId: string | null;
  projectId: string | null;
  projectKey: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadataJson: string | null;
  createdAt: string;
}

export interface CreateApiTokenAuditLogInput {
  tokenType: ApiTokenAuditLogTokenType;
  tokenId: string;
  actorUserId?: string | null;
  projectId?: string | null;
  projectKey?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
}

export interface ApiTokenAuditLogListItem {
  id: string;
  tokenType: ApiTokenAuditLogTokenType;
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

export interface ListPersonalApiTokenAuditLogsQuery {
  page?: number;
  pageSize?: number;
  tokenId?: string;
  action?: string;
  projectKey?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ApiTokenAuditLogListResult {
  items: ApiTokenAuditLogListItem[];
  page: number;
  pageSize: number;
  total: number;
}
