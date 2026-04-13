import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import type { EventBus } from "../../shared/event/event-bus";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ProjectAccessContract } from "../project/project-access.contract";
import type { UploadCommandContract } from "../upload/upload.contract";
import {
  requireRdAcceptAccess
} from "./rd.policy";
import type { RdCommandContract, RdQueryContract } from "./rd.contract";
import { RdRepo } from "./rd.repo";
import { transitionRdItem } from "./rd-state-machine";
import type {
  AdvanceRdStageInput,
  BlockRdItemInput,
  CreateRdItemInput,
  CreateRdStageInput,
  ListRdItemsQuery,
  ListRdStagesQuery,
  RdAction,
  RdDashboardActivity,
  RdDashboardTodo,
  RdItemEntity,
  RdItemListResult,
  RdLogEntity,
  RdStageEntity,
  UpdateRdItemInput,
  UpdateRdStageInput
} from "./rd.types";

type RdMemberRef = {
  assigneeId: string | null;
  assigneeName: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
};

export class RdService implements RdCommandContract, RdQueryContract {
  constructor(
    private readonly repo: RdRepo,
    private readonly projectAccess: ProjectAccessContract,
    private readonly eventBus: EventBus,
    private readonly uploadCommand: UploadCommandContract
  ) {}

  async createStage(input: CreateRdStageInput, ctx: RequestContext): Promise<RdStageEntity> {
    const projectId = input.projectId.trim();
    await this.projectAccess.requireProjectAccess(projectId, ctx, "create rd stage");
    await this.requireStageMaintainer(projectId, ctx, "create rd stage");

    if (this.repo.findStageByProjectAndName(projectId, input.name.trim())) {
      throw new AppError(ERROR_CODES.RD_STAGE_EXISTS, `rd stage already exists: ${input.name}`, 409);
    }

    const now = nowIso();
    const currentStages = this.repo.listStages(projectId);
    const entity: RdStageEntity = {
      id: genId("rds"),
      projectId,
      name: input.name.trim(),
      sort: input.sort ?? currentStages.length + 1,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };

    this.repo.createStage(entity);
    return entity;
  }

  async updateStage(id: string, input: UpdateRdStageInput, ctx: RequestContext): Promise<RdStageEntity> {
    const stage = this.requireStage(id);
    await this.projectAccess.requireProjectAccess(stage.projectId, ctx, "update rd stage");
    await this.requireStageMaintainer(stage.projectId, ctx, "update rd stage");

    if (input.name?.trim() && input.name.trim() !== stage.name) {
      const byName = this.repo.findStageByProjectAndName(stage.projectId, input.name.trim());
      if (byName && byName.id !== stage.id) {
        throw new AppError(ERROR_CODES.RD_STAGE_EXISTS, `rd stage already exists: ${input.name}`, 409);
      }
    }

    const updated = this.repo.updateStage(id, {
      name: input.name?.trim() || stage.name,
      sort: input.sort ?? stage.sort,
      enabled: input.enabled === undefined ? (stage.enabled ? 1 : 0) : input.enabled ? 1 : 0,
      updated_at: nowIso()
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.RD_STAGE_UPDATE_FAILED, "failed to update rd stage", 500);
    }
    return this.requireStage(id);
  }

  async listStages(query: ListRdStagesQuery, ctx: RequestContext): Promise<RdStageEntity[]> {
    await this.projectAccess.requireProjectAccess(query.projectId.trim(), ctx, "list rd stages");
    return this.repo.listStages(query.projectId.trim());
  }

  async createItem(input: CreateRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    const projectId = input.projectId.trim();
    const itemType = input.type ?? "feature_dev";
    await this.projectAccess.requireProjectAccess(projectId, ctx, "create rd item");
    const members = await this.resolveMembers(projectId, input.assigneeId ?? null, input.reviewerId ?? null);
    const stageId = await this.resolveStageId(projectId, input.stageId);
    const now = nowIso();
    const entity: RdItemEntity = {
      id: genId("rdi"),
      projectId,
      rdNo: this.repo.getNextRdNo(projectId, itemType),
      version: 1,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      stageId,
      type: itemType,
      status: "todo",
      priority: input.priority ?? "medium",
      assigneeId: members.assigneeId,
      assigneeName: members.assigneeName,
      creatorId: ctx.userId?.trim() || ctx.accountId,
      creatorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      reviewerId: members.reviewerId,
      reviewerName: members.reviewerName,
      progress: 0,
      planStartAt: input.planStartAt?.trim() || null,
      planEndAt: input.planEndAt?.trim() || null,
      actualStartAt: null,
      actualEndAt: null,
      blockerReason: null,
      createdAt: now,
      updatedAt: now
    };
    this.repo.createItem(entity);
    await this.promoteTempMarkdownUploads(entity.id, entity.description, ctx);
    this.repo.createLog(this.createLog(entity, "create", ctx, `创建研发项 ${entity.rdNo}`));
    await this.emitRdEvent("rd.created", "created", entity, ctx);
    return entity;
  }

  async updateItem(id: string, input: UpdateRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "update rd item");
    await this.requireBasicEditAccess(current, ctx, "update rd item");
    this.requireItemVersion(current, input.version);
    if (input.progress !== undefined) {
      this.requireAssignee(current, ctx, "update rd progress");
      if (input.progress >= 100 && current.status === "doing") {
        return this.complete(id, ctx, input.version);
      }
      if (input.progress < 100 && (current.status === "done" || current.status === "accepted")) {
        return this.applyAction(
          id,
          "resume",
          ctx,
          current,
          {
            progress: input.progress,
            actual_end_at: null,
            blocker_reason: null
          },
          // `resumed rd item by progress update: ${current.progress}% -> ${input.progress}%`
          `更新研发项进度: ${current.progress}% -> ${input.progress}%`,
          undefined,
          input.version
        );
      }
    }
    const members = await this.resolveMembers(
      current.projectId,
      input.assigneeId === undefined ? current.assigneeId : input.assigneeId,
      input.reviewerId === undefined ? current.reviewerId : input.reviewerId
    );
    const stageId =
      input.stageId === undefined ? current.stageId : await this.resolveStageId(current.projectId, input.stageId);
    const updated = this.repo.updateItem(id, {
      title: input.title?.trim() || current.title,
      description: input.description === undefined ? current.description : input.description?.trim() || null,
      stage_id: stageId,
      type: input.type ?? current.type,
      priority: input.priority ?? current.priority,
      assignee_id: members.assigneeId,
      assignee_name: members.assigneeName,
      reviewer_id: members.reviewerId,
      reviewer_name: members.reviewerName,
      progress: input.progress ?? current.progress,
      plan_start_at: input.planStartAt === undefined ? current.planStartAt : input.planStartAt?.trim() || null,
      plan_end_at: input.planEndAt === undefined ? current.planEndAt : input.planEndAt?.trim() || null,
      updated_at: nowIso()
    }, input.version);
    if (!updated) {
      throw new AppError(ERROR_CODES.RD_ITEM_VERSION_CONFLICT, "rd item version conflict", 409);
    }
    const entity = this.requireItem(id);
    await this.promoteTempMarkdownUploads(entity.id, entity.description, ctx);
    this.repo.createLog(this.createLog(entity, "update", ctx, this.createUpdateLogContent(current, input)));
    await this.emitRdEvent("rd.updated", "updated", entity, ctx);
    return entity;
  }

  async start(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "start rd item");
    this.requireAssignee(current, ctx, "start rd item");
    const now = nowIso();
    return this.applyAction(
      id,
      "start",
      ctx,
      current,
      {
        actual_start_at: current.actualStartAt ?? now,
        progress: current.progress > 0 ? current.progress : 10,
        blocker_reason: null
      },
      "标记研发项已开始",
      now
    );
  }

  async block(id: string, input: BlockRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "block rd item");
    await this.requireBlockAccess(current, ctx, "block rd item");
    return this.applyAction(
      id,
      "block",
      ctx,
      current,
      {
        blocker_reason: input.blockerReason?.trim() || current.blockerReason || "blocked"
      },
      "标记研发项已阻塞"
    );
  }

  async resume(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "resume rd item");
    await this.requireBlockAccess(current, ctx, "resume rd item");
    return this.applyAction(id, "resume", ctx, current, { blocker_reason: null }, "标记研发项已恢复");
  }

  async complete(id: string, ctx: RequestContext, expectedVersion?: number): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "complete rd item");
    this.requireAssignee(current, ctx, "complete rd item");
    const now = nowIso();
    return this.applyAction(
      id,
      "complete",
      ctx,
      current,
      {
        actual_end_at: now,
        progress: 100,
        blocker_reason: null
      },
      "标记研发项完成",
      now,
      expectedVersion
    );
  }

  async accept(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "accept rd item");
    requireRdAcceptAccess(current, ctx);
    return this.applyAction(id, "accept", ctx, current, {}, "标记研发项已接受");
  }

  async close(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "close rd item");
    await this.requireCloseAccess(current, ctx, "close rd item");
    return this.applyAction(id, "close", ctx, current, {}, "标记研发项已关闭");
  }

  async advanceStage(id: string, input: AdvanceRdStageInput, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "advance rd stage");
    await this.requireBasicEditAccess(current, ctx, "advance rd stage");
    if (current.status !== "done" && current.status !== "accepted") {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_INVALID_STATUS, "rd item is not completed", 400);
    }

    const targetStage = this.requireStage(input.stageId.trim());
    if (targetStage.projectId !== current.projectId) {
      throw new AppError(ERROR_CODES.RD_STAGE_PROJECT_MISMATCH, "rd stage project mismatch", 400);
    }

    if (current.stageId === targetStage.id) {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_INVALID_TARGET, "rd target stage must be different", 400);
    }

    const currentStage = current.stageId ? this.requireStage(current.stageId) : null;
    if (currentStage && targetStage.sort <= currentStage.sort) {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_INVALID_TARGET, "rd target stage must be after current stage", 400);
    }

    const updated = this.repo.updateItem(id, {
      stage_id: targetStage.id,
      status: "todo",
      progress: 0,
      actual_start_at: null,
      actual_end_at: null,
      blocker_reason: null,
      updated_at: nowIso()
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_FAILED, "failed to advance rd stage", 500);
    }

    const entity = this.requireItem(id);
    const fromStageName = currentStage?.name || "未归类";
    this.repo.createLog(
      this.createLog(entity, "advance_stage", ctx, `推进阶段: ${fromStageName} -> ${targetStage.name}`)
    );
    await this.emitRdEvent("rd.updated", "advance_stage", entity, ctx);
    return entity;
  }

  async delete(id: string, ctx: RequestContext): Promise<{ id: string }> {
    const current = await this.requireItemWithAccess(id, ctx, "delete rd item");
    await this.requireDeleteAccess(current, ctx, "delete rd item");
    const deleted = this.repo.deleteItem(id);
    if (!deleted) {
      throw new AppError(ERROR_CODES.RD_ITEM_DELETE_FAILED, "failed to delete rd item", 500);
    }
    return { id };
  }

  async listItems(query: ListRdItemsQuery, ctx: RequestContext): Promise<RdItemListResult> {
    const normalizedQuery: ListRdItemsQuery = {
      ...query,
      stageIds: query.stageIds ?? (query.stageId?.trim() ? [query.stageId.trim()] : []),
      assigneeIds: query.assigneeIds ?? (query.assigneeId?.trim() ? [query.assigneeId.trim()] : []),
      stageId: query.stageIds && query.stageIds.length > 0 ? undefined : query.stageId,
      assigneeId: query.assigneeIds && query.assigneeIds.length > 0 ? undefined : query.assigneeId,
    };

    if (query.projectId?.trim()) {
      await this.projectAccess.requireProjectAccess(query.projectId.trim(), ctx, "list rd items");
      return this.repo.listItems(normalizedQuery, [query.projectId.trim()]);
    }

    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    return this.repo.listItems(normalizedQuery, projectIds);
  }

  async getItemById(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    return this.requireItemWithAccess(id, ctx, "get rd item");
  }

  async listLogs(id: string, ctx: RequestContext): Promise<RdLogEntity[]> {
    await this.requireItemWithAccess(id, ctx, "list rd logs");
    return this.repo.listLogs(id);
  }

  async countAssignedForDashboard(projectIds: string[], userId: string, _ctx: RequestContext): Promise<number> {
    return this.repo.countAssignedForDashboard(projectIds, userId);
  }

  async countInProgressForDashboard(projectIds: string[], userId: string, _ctx: RequestContext): Promise<number> {
    return this.repo.countInProgressForDashboard(projectIds, userId);
  }

  async countReviewingForDashboard(projectIds: string[], userId: string, _ctx: RequestContext): Promise<number> {
    return this.repo.countReviewingForDashboard(projectIds, userId);
  }

  async listTodosForDashboard(
    projectIds: string[],
    userId: string,
    limit: number,
    _ctx: RequestContext
  ): Promise<RdDashboardTodo[]> {
    return this.repo.listTodosForDashboard(projectIds, userId, limit);
  }

  async listActivitiesForDashboard(
    projectIds: string[],
    userId: string,
    limit: number,
    _ctx: RequestContext
  ): Promise<RdDashboardActivity[]> {
    return this.repo.listActivitiesForDashboard(projectIds, userId, limit);
  }

  private requireStage(id: string): RdStageEntity {
    const stage = this.repo.findStageById(id);
    if (!stage) {
      throw new AppError(ERROR_CODES.RD_STAGE_NOT_FOUND, `rd stage not found: ${id}`, 404);
    }
    return stage;
  }

  private requireItem(id: string): RdItemEntity {
    const item = this.repo.findItemById(id);
    if (!item) {
      throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, `rd item not found: ${id}`, 404);
    }
    return item;
  }

  private async requireItemWithAccess(id: string, ctx: RequestContext, action: string): Promise<RdItemEntity> {
    const item = this.requireItem(id);
    await this.projectAccess.requireProjectAccess(item.projectId, ctx, action);
    return item;
  }

  private async requireStageMaintainer(projectId: string, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.RD_STAGE_FORBIDDEN, `${action} forbidden`, 403);
    }

    const member = await this.projectAccess.requireProjectMember(projectId, userId, action);
    if (member.roleCode !== "project_admin" && !member.isOwner) {
      throw new AppError(ERROR_CODES.RD_STAGE_FORBIDDEN, `${action} forbidden`, 403);
    }
  }

  private async requireBasicEditAccess(item: RdItemEntity, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.RD_EDIT_FORBIDDEN, `${action} forbidden`, 403);
    }

    if (item.creatorId === userId || item.assigneeId === userId) {
      return;
    }

    const member = await this.projectAccess.requireProjectMember(item.projectId, userId, action);
    if (member.roleCode === "project_admin" || member.isOwner) {
      return;
    }

    throw new AppError(ERROR_CODES.RD_EDIT_FORBIDDEN, `${action} forbidden`, 403);
  }

  private async requireDeleteAccess(item: RdItemEntity, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.RD_DELETE_FORBIDDEN, `${action} forbidden`, 403);
    }

    if (item.creatorId === userId) {
      return;
    }

    const member = await this.projectAccess.requireProjectMember(item.projectId, userId, action);
    if (member.roleCode === "project_admin" || member.isOwner) {
      return;
    }

    throw new AppError(ERROR_CODES.RD_DELETE_FORBIDDEN, `${action} forbidden`, 403);
  }

  private async requireCloseAccess(item: RdItemEntity, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.RD_CLOSE_FORBIDDEN, `${action} forbidden`, 403);
    }

    if (item.creatorId === userId) {
      return;
    }

    const member = await this.projectAccess.requireProjectMember(item.projectId, userId, action);
    if (member.roleCode === "project_admin" || member.isOwner) {
      return;
    }

    throw new AppError(ERROR_CODES.RD_CLOSE_FORBIDDEN, `${action} forbidden`, 403);
  }

  private requireAssignee(item: RdItemEntity, ctx: RequestContext, action: string): void {
    const userId = ctx.userId?.trim();
    if (!userId || !item.assigneeId || item.assigneeId !== userId) {
      throw new AppError(ERROR_CODES.RD_PROGRESS_FORBIDDEN, `${action} forbidden`, 403);
    }
  }

  private async requireBlockAccess(item: RdItemEntity, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.RD_BLOCK_FORBIDDEN, `${action} forbidden`, 403);
    }

    if (item.assigneeId && item.assigneeId === userId) {
      return;
    }

    const member = await this.projectAccess.requireProjectMember(item.projectId, userId, action);
    if (member.roleCode === "project_admin" || member.isOwner) {
      return;
    }

    throw new AppError(ERROR_CODES.RD_BLOCK_FORBIDDEN, `${action} forbidden`, 403);
  }

  private async resolveStageId(projectId: string, stageId: string | null | undefined): Promise<string | null> {
    const normalized = stageId?.trim() || null;
    if (!normalized) {
      return null;
    }
    const stage = this.requireStage(normalized);
    if (stage.projectId !== projectId) {
      throw new AppError(ERROR_CODES.RD_STAGE_PROJECT_MISMATCH, "rd stage project mismatch", 400);
    }
    return stage.id;
  }

  private async resolveMembers(
    projectId: string,
    assigneeId: string | null | undefined,
    reviewerId: string | null | undefined
  ): Promise<RdMemberRef> {
    let assigneeName: string | null = null;
    let reviewerName: string | null = null;
    let normalizedAssigneeId = assigneeId?.trim() || null;
    let normalizedReviewerId = reviewerId?.trim() || null;

    if (normalizedAssigneeId) {
      const assignee = await this.projectAccess.requireProjectMember(projectId, normalizedAssigneeId, "resolve rd assignee");
      normalizedAssigneeId = assignee.userId;
      assigneeName = assignee.displayName;
    }

    if (normalizedReviewerId) {
      const reviewer = await this.projectAccess.requireProjectMember(projectId, normalizedReviewerId, "resolve rd reviewer");
      normalizedReviewerId = reviewer.userId;
      reviewerName = reviewer.displayName;
    }

    return {
      assigneeId: normalizedAssigneeId,
      assigneeName,
      reviewerId: normalizedReviewerId,
      reviewerName
    };
  }

  private async applyAction(
    id: string,
    action: Exclude<RdAction, "create" | "update">,
    ctx: RequestContext,
    current: RdItemEntity,
    extra: Record<string, unknown>,
    content: string,
    actionAt?: string,
    expectedVersion?: number
  ): Promise<RdItemEntity> {
    const nextStatus = transitionRdItem(current.status, action);
    const updatedAt = actionAt ?? nowIso();
    const updated = this.repo.updateItem(id, {
      status: nextStatus,
      updated_at: updatedAt,
      ...extra
    }, expectedVersion);
    if (!updated) {
      if (expectedVersion !== undefined) {
        throw new AppError(ERROR_CODES.RD_ITEM_VERSION_CONFLICT, "rd item version conflict", 409);
      }
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, `failed to ${action} rd item`, 500);
    }
    const entity = this.requireItem(id);
    this.repo.createLog(this.createLog(entity, action, ctx, content));
    await this.emitRdEvent("rd.updated", action, entity, ctx);
    return entity;
  }

  private createLog(item: RdItemEntity, action: RdAction, ctx: RequestContext, content: string): RdLogEntity {
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

  private requireItemVersion(item: RdItemEntity, version: number): void {
    if (item.version !== version) {
      throw new AppError(ERROR_CODES.RD_ITEM_VERSION_CONFLICT, "rd item version conflict", 409);
    }
  }

  private createUpdateLogContent(current: RdItemEntity, input: UpdateRdItemInput): string {
    const changes: string[] = [];
    if (input.progress !== undefined && input.progress !== current.progress) {
      changes.push(`进度: ${current.progress}% -> ${input.progress}%`);
    }
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
    if (input.assigneeId !== undefined && (input.assigneeId?.trim() || null) !== current.assigneeId) {
      changes.push("更新执行人");
    }
    if (input.reviewerId !== undefined && (input.reviewerId?.trim() || null) !== current.reviewerId) {
      changes.push("更新验证人");
    }
    if (input.planStartAt !== undefined || input.planEndAt !== undefined) {
      changes.push("更新计划时间");
    }
    return changes.length > 0 ? changes.join("；") : "更新研发项信息";
  }

  private async emitRdEvent(type: string, action: string, item: RdItemEntity, ctx: RequestContext): Promise<void> {
    await this.eventBus.emit({
      type,
      scope: "project",
      projectId: item.projectId,
      entityType: "rd",
      entityId: item.id,
      action,
      actorId: ctx.accountId,
      occurredAt: item.updatedAt,
      payload: {
        rdNo: item.rdNo,
        title: item.title,
        status: item.status,
        priority: item.priority,
        assigneeId: item.assigneeId,
        creatorId: item.creatorId,
        reviewerId: item.reviewerId
      }
    });
  }

  private async promoteTempMarkdownUploads(itemId: string, description: string | null, ctx: RequestContext): Promise<void> {
    await this.uploadCommand.promoteMarkdownUploads(
      {
        content: description,
        bucket: "rd",
        entityId: itemId
      },
      ctx
    );
  }
}
