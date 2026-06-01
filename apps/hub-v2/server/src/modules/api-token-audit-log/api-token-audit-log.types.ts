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
