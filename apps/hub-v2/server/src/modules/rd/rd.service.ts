import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import type { EventBus } from "../../shared/event/event-bus";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ProjectAccessContract } from "../project/project-access.contract";
import {
  requireRdAcceptAccess,
  requireRdBlockAccess,
  requireRdCloseAccess,
  requireRdCompleteAccess,
  requireRdEditAccess,
  requireRdStageManageAccess,
  requireRdStartAccess
} from "./rd.policy";
import type { RdCommandContract, RdQueryContract } from "./rd.contract";
import { RdRepo } from "./rd.repo";
import { transitionRdItem } from "./rd-state-machine";
import type {
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
    private readonly eventBus: EventBus
  ) {}

  async createStage(input: CreateRdStageInput, ctx: RequestContext): Promise<RdStageEntity> {
    requireRdStageManageAccess(ctx);
    const projectId = input.projectId.trim();
    await this.projectAccess.requireProjectAccess(projectId, ctx, "create rd stage");

    if (this.repo.findStageByProjectAndName(projectId, input.name.trim())) {
      throw new AppError("RD_STAGE_EXISTS", `rd stage already exists: ${input.name}`, 409);
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
    requireRdStageManageAccess(ctx);
    const stage = this.requireStage(id);
    await this.projectAccess.requireProjectAccess(stage.projectId, ctx, "update rd stage");

    if (input.name?.trim() && input.name.trim() !== stage.name) {
      const byName = this.repo.findStageByProjectAndName(stage.projectId, input.name.trim());
      if (byName && byName.id !== stage.id) {
        throw new AppError("RD_STAGE_EXISTS", `rd stage already exists: ${input.name}`, 409);
      }
    }

    const updated = this.repo.updateStage(id, {
      name: input.name?.trim() || stage.name,
      sort: input.sort ?? stage.sort,
      enabled: input.enabled === undefined ? (stage.enabled ? 1 : 0) : input.enabled ? 1 : 0,
      updated_at: nowIso()
    });
    if (!updated) {
      throw new AppError("RD_STAGE_UPDATE_FAILED", "failed to update rd stage", 500);
    }
    return this.requireStage(id);
  }

  async listStages(query: ListRdStagesQuery, ctx: RequestContext): Promise<RdStageEntity[]> {
    await this.projectAccess.requireProjectAccess(query.projectId.trim(), ctx, "list rd stages");
    return this.repo.listStages(query.projectId.trim());
  }

  async createItem(input: CreateRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    const projectId = input.projectId.trim();
    await this.projectAccess.requireProjectAccess(projectId, ctx, "create rd item");
    const members = await this.resolveMembers(projectId, input.assigneeId ?? null, input.reviewerId ?? null);
    const stageId = await this.resolveStageId(projectId, input.stageId);
    const now = nowIso();
    const entity: RdItemEntity = {
      id: genId("rdi"),
      projectId,
      rdNo: this.repo.getNextRdNo(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      stageId,
      type: input.type ?? "feature",
      status: "todo",
      priority: input.priority ?? "medium",
      assigneeId: members.assigneeId,
      assigneeName: members.assigneeName,
      creatorId: ctx.userId?.trim() || ctx.accountId,
      creatorName: ctx.userId?.trim() || ctx.accountId,
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
    this.repo.createLog(this.createLog(entity, "create", ctx, `created ${entity.rdNo}`));
    await this.emitRdEvent("rd.created", "created", entity, ctx);
    return entity;
  }

  async updateItem(id: string, input: UpdateRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "update rd item");
    requireRdEditAccess(current, ctx);
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
    });
    if (!updated) {
      throw new AppError("RD_ITEM_UPDATE_FAILED", "failed to update rd item", 500);
    }
    const entity = this.requireItem(id);
    this.repo.createLog(this.createLog(entity, "update", ctx, "updated rd item"));
    await this.emitRdEvent("rd.updated", "updated", entity, ctx);
    return entity;
  }

  async start(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "start rd item");
    requireRdStartAccess(current, ctx);
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
      "started rd item",
      now
    );
  }

  async block(id: string, input: BlockRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "block rd item");
    requireRdBlockAccess(current, ctx);
    return this.applyAction(
      id,
      "block",
      ctx,
      current,
      {
        blocker_reason: input.blockerReason?.trim() || current.blockerReason || "blocked"
      },
      "blocked rd item"
    );
  }

  async resume(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "resume rd item");
    requireRdBlockAccess(current, ctx);
    return this.applyAction(id, "resume", ctx, current, { blocker_reason: null }, "resumed rd item");
  }

  async complete(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "complete rd item");
    requireRdCompleteAccess(current, ctx);
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
      "completed rd item",
      now
    );
  }

  async accept(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "accept rd item");
    requireRdAcceptAccess(current, ctx);
    return this.applyAction(id, "accept", ctx, current, {}, "accepted rd item");
  }

  async close(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "close rd item");
    requireRdCloseAccess(ctx);
    return this.applyAction(id, "close", ctx, current, {}, "closed rd item");
  }

  async listItems(query: ListRdItemsQuery, ctx: RequestContext): Promise<RdItemListResult> {
    if (query.projectId?.trim()) {
      await this.projectAccess.requireProjectAccess(query.projectId.trim(), ctx, "list rd items");
      return this.repo.listItems(query, [query.projectId.trim()]);
    }

    if (ctx.roles.includes("admin")) {
      return this.repo.listItems(query);
    }

    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    return this.repo.listItems(query, projectIds);
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
      throw new AppError("RD_STAGE_NOT_FOUND", `rd stage not found: ${id}`, 404);
    }
    return stage;
  }

  private requireItem(id: string): RdItemEntity {
    const item = this.repo.findItemById(id);
    if (!item) {
      throw new AppError("RD_ITEM_NOT_FOUND", `rd item not found: ${id}`, 404);
    }
    return item;
  }

  private async requireItemWithAccess(id: string, ctx: RequestContext, action: string): Promise<RdItemEntity> {
    const item = this.requireItem(id);
    await this.projectAccess.requireProjectAccess(item.projectId, ctx, action);
    return item;
  }

  private async resolveStageId(projectId: string, stageId: string | null | undefined): Promise<string | null> {
    const normalized = stageId?.trim() || null;
    if (!normalized) {
      return null;
    }
    const stage = this.requireStage(normalized);
    if (stage.projectId !== projectId) {
      throw new AppError("RD_STAGE_PROJECT_MISMATCH", "rd stage project mismatch", 400);
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
    actionAt?: string
  ): Promise<RdItemEntity> {
    const nextStatus = transitionRdItem(current.status, action);
    const updatedAt = actionAt ?? nowIso();
    const updated = this.repo.updateItem(id, {
      status: nextStatus,
      updated_at: updatedAt,
      ...extra
    });
    if (!updated) {
      throw new AppError("RD_ACTION_FAILED", `failed to ${action} rd item`, 500);
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
      operatorName: ctx.userId?.trim() || ctx.accountId,
      metaJson: null,
      createdAt: nowIso()
    };
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
        priority: item.priority
      }
    });
  }
}
