import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ApiTokenAuditLogCommandContract, ApiTokenAuditLogQueryContract } from "./api-token-audit-log.contract";
import { ApiTokenAuditLogRepo } from "./api-token-audit-log.repo";
import type {
  ApiTokenAuditLogListResult,
  CreateApiTokenAuditLogInput,
  ListPersonalApiTokenAuditLogsQuery
} from "./api-token-audit-log.types";

export class ApiTokenAuditLogService implements ApiTokenAuditLogCommandContract, ApiTokenAuditLogQueryContract {
  constructor(private readonly repo: ApiTokenAuditLogRepo) {}

  create(input: CreateApiTokenAuditLogInput): void {
    try {
      this.repo.create({
        id: genId("tlog"),
        tokenType: input.tokenType,
        tokenId: input.tokenId.trim(),
        actorUserId: input.actorUserId?.trim() || null,
        projectId: input.projectId?.trim() || null,
        projectKey: input.projectKey?.trim() || null,
        action: input.action.trim(),
        resourceType: input.resourceType.trim(),
        resourceId: input.resourceId?.trim() || null,
        ip: input.ip?.trim() || null,
        userAgent: input.userAgent?.trim() || null,
        metadataJson: input.metadata === undefined ? null : JSON.stringify(input.metadata),
        createdAt: nowIso()
      });
    } catch (error) {
      console.error("[api-token-audit-log] failed to record audit log", error);
    }
  }

  listPersonalByActor(actorUserId: string, query: ListPersonalApiTokenAuditLogsQuery): ApiTokenAuditLogListResult {
    const normalizedActorUserId = actorUserId.trim();
    if (!normalizedActorUserId) {
      return { items: [], page: 1, pageSize: query.pageSize ?? 20, total: 0 };
    }
    return this.repo.listPersonalByActor(normalizedActorUserId, query);
  }
}
