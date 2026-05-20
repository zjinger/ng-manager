import type { PageResult } from "../../shared/http/pagination";

export type AuditLogModule = "user" | "organization" | "title" | "role" | "permission" | "settings";
export type AuditLogAction = "create" | "update" | "delete" | "enable" | "disable" | "reset" | "assign" | "remove";
export type AuditLogLevel = "info" | "warn" | "error";

export interface AuditLogEntity {
  id: string;
  module: AuditLogModule;
  action: AuditLogAction;
  level: AuditLogLevel;
  actorId: string | null;
  actorName: string | null;
  actorUserId: string | null;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  summary: string;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  metaJson: string | null;
  createdAt: string;
}

export interface CreateAuditLogInput {
  module: AuditLogModule;
  action: AuditLogAction;
  level?: AuditLogLevel;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  summary: string;
  before?: unknown;
  after?: unknown;
  meta?: unknown;
}

export interface ListAuditLogsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  module?: AuditLogModule;
  action?: AuditLogAction;
  level?: AuditLogLevel;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type AuditLogListResult = PageResult<AuditLogEntity>;
