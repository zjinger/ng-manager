import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import type { RdItemEntity, RdStageTaskEntity } from "../rd.types";
import type { RdMemberService } from "./rd-member.service";
import type { RdServiceContext } from "./rd-service-context";

export class RdPermissionService {
  constructor(
    private readonly context: RdServiceContext,
    private readonly member: RdMemberService
  ) {}

  async requireStageMaintainer(projectId: string, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.RD_STAGE_FORBIDDEN, `${action} forbidden`, 403);
    }

    const member = await this.context.projectAccess.requireProjectMember(projectId, userId, action);
    if (member.roleCode !== "project_admin" && !member.isOwner) {
      throw new AppError(ERROR_CODES.RD_STAGE_FORBIDDEN, `${action} forbidden`, 403);
    }
  }

  async requireBasicEditAccess(item: RdItemEntity, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.RD_EDIT_FORBIDDEN, `${action} forbidden`, 403);
    }

    if (item.creatorId === userId) {
      return;
    }

    throw new AppError(ERROR_CODES.RD_EDIT_FORBIDDEN, `${action} forbidden`, 403);
  }

  async requireStageTaskEditAccess(
    item: RdItemEntity,
    task: RdStageTaskEntity,
    ctx: RequestContext,
    action: string
  ): Promise<void> {
    const userId = ctx.userId?.trim();
    if (userId && (task.ownerId === userId || task.ownerIds.includes(userId))) {
      return;
    }
    await this.requireBasicEditAccess(item, ctx, action);
  }

  async requireCloseAccess(item: RdItemEntity, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.RD_CLOSE_FORBIDDEN, `${action} forbidden`, 403);
    }

    if (item.creatorId === userId) {
      return;
    }

    throw new AppError(ERROR_CODES.RD_CLOSE_FORBIDDEN, `${action} forbidden`, 403);
  }

  async requireAdvanceAccess(item: RdItemEntity, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    const effectiveVerifierId = this.member.getEffectiveVerifierId(item);
    if (!userId || !effectiveVerifierId || effectiveVerifierId !== userId) {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_FORBIDDEN, `${action} forbidden`, 403);
    }
  }

  requireAssignee(item: RdItemEntity, ctx: RequestContext, action: string): void {
    const userId = ctx.userId?.trim();
    if (!userId || !item.assigneeId || item.assigneeId !== userId) {
      throw new AppError(ERROR_CODES.RD_PROGRESS_FORBIDDEN, `${action} forbidden`, 403);
    }
  }

  requireCompleteAccess(item: RdItemEntity, ctx: RequestContext, action: string): void {
    if (this.member.isVerifier(item, ctx)) {
      return;
    }
    throw new AppError(ERROR_CODES.RD_PROGRESS_FORBIDDEN, `${action} forbidden`, 403);
  }

  async requireBlockAccess(item: RdItemEntity, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.RD_BLOCK_FORBIDDEN, `${action} forbidden`, 403);
    }

    if (item.assigneeId && item.assigneeId === userId) {
      return;
    }

    const member = await this.context.projectAccess.requireProjectMember(item.projectId, userId, action);
    if (member.roleCode === "project_admin" || member.isOwner) {
      return;
    }

    throw new AppError(ERROR_CODES.RD_BLOCK_FORBIDDEN, `${action} forbidden`, 403);
  }

  requireProgressMember(item: RdItemEntity, targetUserId: string, action: string): void {
    const memberIds = new Set([...(item.memberIds ?? []), ...(item.assigneeId ? [item.assigneeId] : [])]);
    if (!memberIds.has(targetUserId)) {
      throw new AppError(ERROR_CODES.RD_PROGRESS_FORBIDDEN, `${action} forbidden`, 403);
    }
  }
}
