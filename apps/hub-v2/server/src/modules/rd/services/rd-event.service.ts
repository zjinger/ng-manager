import type { RequestContext } from "../../../shared/context/request-context";
import type { RdItemEntity } from "../rd.types";
import type { RdServiceContext } from "./rd-service-context";

export class RdEventService {
  constructor(private readonly context: RdServiceContext) {}

  async emitRdEvent(type: string, action: string, item: RdItemEntity, ctx: RequestContext): Promise<void> {
    await this.context.eventBus.emit({
      type,
      scope: "project",
      projectId: item.projectId,
      entityType: "rd",
      entityId: item.id,
      action,
      actorId: ctx.userId?.trim() || ctx.accountId,
      occurredAt: item.updatedAt,
      payload: {
        rdNo: item.rdNo,
        title: item.title,
        status: item.status,
        priority: item.priority,
        assigneeId: item.assigneeId,
        memberIds: item.memberIds,
        creatorId: item.creatorId,
        verifierId: item.verifierId,
        reviewerId: item.verifierId
      }
    });
  }
}
