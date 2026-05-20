import type { RequestContext } from "../../shared/context/request-context";
import type { AuditLogListResult, CreateAuditLogInput, ListAuditLogsQuery } from "./audit-log.types";

export interface AuditLogCommandContract {
  record(input: CreateAuditLogInput, ctx: RequestContext): void;
}

export interface AuditLogQueryContract {
  list(query: ListAuditLogsQuery): AuditLogListResult;
}
