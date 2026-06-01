import type {
  ApiTokenAuditLogListResult,
  CreateApiTokenAuditLogInput,
  ListPersonalApiTokenAuditLogsQuery
} from "./api-token-audit-log.types";

export interface ApiTokenAuditLogCommandContract {
  create(input: CreateApiTokenAuditLogInput): void;
}

export interface ApiTokenAuditLogQueryContract {
  listPersonalByActor(actorUserId: string, query: ListPersonalApiTokenAuditLogsQuery): ApiTokenAuditLogListResult;
}
