import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import type { RdAction, RdItemEntity, RdLogEntity, UpdateRdItemInput } from "../rd.types";
import type { RdMemberService } from "./rd-member.service";
import type { RdServiceContext } from "./rd-service-context";

export class RdLogService {
  constructor(
    private readonly context: RdServiceContext,
    private readonly member: RdMemberService
  ) {}

  async listLogs(id: string, ctx: RequestContext): Promise<RdLogEntity[]> {
    await this.requireItemWithAccess(id, ctx, "list rd logs");
    return this.context.repo.listLogs(id);
  }

  private async requireItemWithAccess(id: string, ctx: RequestContext, action: string): Promise<RdItemEntity> {
    const item = this.context.repo.findItemById(id);
    if (!item) {
      throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, `rd item not found: ${id}`, 404);
    }
    await this.context.projectAccess.requireProjectAccess(item.projectId, ctx, action);
    return item;
  }

  createLog(item: RdItemEntity, action: RdAction, ctx: RequestContext, content: string): RdLogEntity {
    return {
      id: genId("rdlog"),
      projectId: item.projectId,
      itemId: item.id,
      actionType: action,
      content,
      operatorId: ctx.userId?.trim() || ctx.accountId,
      operatorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      metaJson: null,
      createdAt: nowIso()
    };
  }

  async createUpdateLogContent(current: RdItemEntity, input: UpdateRdItemInput): Promise<string> {
    const changes: string[] = [];
    if (input.title !== undefined && input.title.trim() !== current.title) {
      changes.push("更新标题");
    }
    if (input.description !== undefined) {
      const next = input.description?.trim() || null;
      if (next !== current.description) {
        changes.push("更新描述");
      }
    }
    if (input.stageId !== undefined && (input.stageId?.trim() || null) !== current.stageId) {
      changes.push("更新阶段");
    }
    if (input.type !== undefined && input.type !== current.type) {
      changes.push(`类型: ${current.type} -> ${input.type}`);
    }
    if (input.priority !== undefined && input.priority !== current.priority) {
      changes.push(`优先级: ${current.priority} -> ${input.priority}`);
    }
    if (input.memberIds !== undefined) {
      const memberChange = await this.createMemberChangeLogContent(current.projectId, current.memberIds ?? [], input.memberIds ?? []);
      if (memberChange) {
        changes.push(memberChange);
      }
    }
    if (input.verifierId !== undefined && (input.verifierId?.trim() || null) !== current.verifierId) {
      changes.push("更新验证人");
    }
    if (input.planStartAt !== undefined || input.planEndAt !== undefined) {
      changes.push("更新计划时间");
    }
    return changes.length > 0 ? changes.join("；") : "更新研发项信息";
  }

  private async createMemberChangeLogContent(
    projectId: string,
    currentMemberIds: string[],
    nextMemberIds: string[]
  ): Promise<string> {
    const currentIds = this.member.collectEffectiveMemberIds(currentMemberIds);
    const nextIds = this.member.collectEffectiveMemberIds(nextMemberIds);
    const currentSet = new Set(currentIds);
    const nextSet = new Set(nextIds);
    const addedIds = nextIds.filter((id) => !currentSet.has(id));
    const removedIds = currentIds.filter((id) => !nextSet.has(id));
    const parts: string[] = [];
    if (addedIds.length > 0) {
      const names = await this.member.resolveMemberNamesFallback(projectId, addedIds);
      parts.push(`新增执行人: ${names.join("、")}`);
    }
    if (removedIds.length > 0) {
      const names = await this.member.resolveMemberNamesFallback(projectId, removedIds);
      parts.push(`移除执行人: ${names.join("、")}`);
    }
    if (parts.length > 0) {
      return parts.join("；");
    }
    if (currentIds.length !== nextIds.length || currentIds.some((id, index) => id !== nextIds[index])) {
      return "调整执行人顺序";
    }
    return "";
  }
}
