import type { CreateApiTokenAuditLogInput } from "./api-token-audit-log.types";

export interface ApiTokenAuditLogCommandContract {
  create(input: CreateApiTokenAuditLogInput): void;
}
