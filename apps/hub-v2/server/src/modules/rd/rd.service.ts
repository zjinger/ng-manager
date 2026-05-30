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
import { resolveRdStageKey } from "./rd-stage-task-templates";
import { transitionRdItem } from "./rd-state-machine";
import type {
  AdvanceRdStageInput,
  BlockRdItemInput,
  CloseRdItemInput,
  CompleteRdItemInput,
  CreateRdMemberBlockInput,
  CreateRdItemInput,
  RdInitialStageTaskInput,
  CreateRdStageInput,
  CreateRdStageTaskInput,
  ListRdItemsQuery,
  ListRdStagesQuery,
  RdAction,
  RdDashboardActivity,
  RdDashboardTodo,
  RdItemEntity,
  RdItemListResult,
  RdItemProgress,
  RdLogEntity,
  RdMemberBlockEntity,
  RdProgressHistory,
  RdStageHistoryEntry,
  RdStageEntity,
  RdStageTaskEntity,
  RdStageTaskTemplateEntity,
  RdStageTaskTemplateSelectionInput,
  UpdateRdItemInput,
  UpdateRdItemProgressInput,
  ResolveRdMemberBlockInput,
  UpdateRdStageTaskInput,
  UpdateRdStageInput
} from "./rd.types";

type RdMemberRef = {
  memberIds: string[];
  memberNames: string[];
  verifierId: string | null;
  verifierName: string | null;
};

type ResolvedStageTaskTemplateSelection = {
  template: RdStageTaskTemplateEntity;
  ownerId: string | null;
  ownerName: string | null;
};

type ResolvedInitialStageTask = {
  stageKey: string;
  title: string;
  description: string | null;
  ownerId: string | null;
  ownerName: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
};

type ResolvedStageTaskOwners = {
  ownerId: string | null;
  ownerName: string | null;
  ownerIds: string[];
  ownerNames: string[];
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
    const creatorId = ctx.userId?.trim() || ctx.accountId;
    const creatorName = ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId;
    const requestedVerifierId = input.verifierId?.trim() || null;
    const defaultVerifierId = requestedVerifierId || creatorId;
    await this.projectAccess.requireProjectAccess(projectId, ctx, "create rd item");
    const members = await this.resolveMembers(projectId, input.memberIds ?? [], defaultVerifierId);
    const stageId = await this.resolveStageId(projectId, input.stageId);
    const planStartAt = input.planStartAt?.trim() || null;
    const planEndAt = input.planEndAt?.trim() || null;
    const selectedTemplateTasks = await this.resolveStageTaskTemplateSelections(
      projectId,
      stageId,
      input.stageTaskTemplates ?? []
    );
    const selectedInitialStageTasks = await this.resolveInitialStageTasks(
      projectId,
      stageId,
      input.stageTasks ?? [],
      members.memberIds,
      planStartAt,
      planEndAt
    );
    const now = nowIso();
    const memberIds = members.memberIds;
    const assigneeId = memberIds.length > 0 ? memberIds[0] : null;
    const assigneeName = memberIds.length > 0 ? members.memberNames[0] : null;
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
      assigneeId,
      assigneeName,
      creatorId,
      creatorName,
      verifierId: members.verifierId,
      verifierName: members.verifierName,
      memberIds,
      progress: 0,
      planStartAt,
      planEndAt,
      actualStartAt: null,
      actualEndAt: null,
      blockerReason: null,
      createdAt: now,
      updatedAt: now
    };
    this.repo.transaction(() => {
      this.repo.createItem(entity);
      this.ensureMemberProgressRows(entity.id, memberIds, now);
      if (selectedTemplateTasks.length > 0) {
        this.initializeStageTasksFromTemplates(projectId, entity.id, selectedTemplateTasks, now);
      }
      if (selectedInitialStageTasks.length > 0) {
        this.initializeStageTasks(projectId, entity.id, selectedInitialStageTasks, now);
      }
    });
    await this.promoteTempMarkdownUploads(entity.id, entity.description, ctx);
    this.repo.createLog(this.createLog(entity, "create", ctx, `创建研发项 ${entity.rdNo}`));
    await this.emitRdEvent("rd.created", "created", entity, ctx);
    return this.withVerifierFallback(entity);
  }

  async updateItem(id: string, input: UpdateRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "update rd item");
    await this.requireBasicEditAccess(current, ctx, "update rd item");
    this.requireItemVersion(current, input.version);
    const members = await this.resolveMembers(
      current.projectId,
      input.memberIds === undefined ? this.collectEffectiveMemberIds(current.memberIds, current.assigneeId) : input.memberIds,
      input.verifierId === undefined ? current.verifierId : input.verifierId
    );
    const memberIds = members.memberIds;
    const assigneeId = memberIds.length > 0 ? memberIds[0] : current.assigneeId;
    const assigneeName = memberIds.length > 0 ? members.memberNames[0] : current.assigneeName;
    const stageId =
      input.stageId === undefined ? current.stageId : await this.resolveStageId(current.projectId, input.stageId);
    const now = nowIso();
    const updated = this.repo.transaction(() => {
      const success = this.repo.updateItem(id, {
        title: input.title?.trim() || current.title,
        description: input.description === undefined ? current.description : input.description?.trim() || null,
        stage_id: stageId,
        type: input.type ?? current.type,
        priority: input.priority ?? current.priority,
        assignee_id: assigneeId,
        assignee_name: assigneeName,
        verifier_id: members.verifierId,
        verifier_name: members.verifierName,
        member_ids: JSON.stringify(memberIds),
        plan_start_at: input.planStartAt === undefined ? current.planStartAt : input.planStartAt?.trim() || null,
        plan_end_at: input.planEndAt === undefined ? current.planEndAt : input.planEndAt?.trim() || null,
        updated_at: now
      }, input.version);
      if (success) {
        this.ensureMemberProgressRows(id, [...current.memberIds, current.assigneeId ?? "", ...memberIds], now);
      }
      return success;
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.RD_ITEM_VERSION_CONFLICT, "rd item version conflict", 409);
    }
    const entity = this.requireItem(id);
    await this.promoteTempMarkdownUploads(entity.id, entity.description, ctx);
    this.repo.createLog(this.createLog(entity, "update", ctx, await this.createUpdateLogContent(current, input)));
    await this.emitRdEvent("rd.updated", "updated", entity, ctx);
    return this.withVerifierFallback(entity);
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

  async reopen(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "reopen rd item");
    await this.requireCloseAccess(current, ctx, "reopen rd item");
    const reopenStatus = this.getReopenStatusByProgress(current.progress);
    const updated = this.repo.updateItem(id, {
      status: reopenStatus,
      blocker_reason: null,
      actual_end_at: null,
      updated_at: nowIso()
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to reopen rd item", 500);
    }
    const entity = this.requireItem(id);
    this.repo.createLog(this.createLog(entity, "reopen", ctx, "恢复研发项"));
    await this.emitRdEvent("rd.updated", "reopen", entity, ctx);
    return entity;
  }

  async complete(id: string, ctx: RequestContext, input: CompleteRdItemInput = {}, expectedVersion?: number): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "complete rd item");
    this.requireCompleteAccess(current, ctx, "complete rd item");
    const now = nowIso();
    const byVerifier = this.isVerifier(current, ctx);
    const progressOverview = await this.createMemberProgressOverview(current);
    const taskOverview = this.createCurrentStageTaskProgressOverview(current);
    const reason = input.reason?.trim() || "";
    if (taskOverview.hasIncomplete) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "current stage tasks must be completed before completing rd item", 400);
    }
    if (progressOverview.hasIncomplete && !reason) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "complete reason is required when member progress is incomplete", 400);
    }
    const completeLogParts = [
      byVerifier ? "验证人标记完成" : "标记研发项完成",
      reason ? `说明：${reason}` : "",
      taskOverview.summary ? `阶段任务：${taskOverview.summary}` : "",
      progressOverview.summary ? `成员进度：${progressOverview.summary}` : "",
    ].filter(Boolean);
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
      completeLogParts.join("；"),
      now,
      expectedVersion
    );
  }

  async accept(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "accept rd item");
    requireRdAcceptAccess(current, ctx);
    const stageName = current.stageId ? this.repo.findStageById(current.stageId)?.name || "当前" : "当前";
    return this.applyAction(id, "accept", ctx, current, {}, `标记${stageName}阶段已经完成`);
  }

  async close(id: string, input: CloseRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "close rd item");
    await this.requireCloseAccess(current, ctx, "close rd item");
    const reason = input.reason?.trim();
    return this.applyAction(
      id,
      "close",
      ctx,
      current,
      {},
      reason ? `关闭研发项：${reason}` : "标记研发项已关闭"
    );
  }

  async advanceStage(id: string, input: AdvanceRdStageInput, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "advance rd stage");
    await this.requireAdvanceAccess(current, ctx, "advance rd stage");
    if (current.status !== "accepted") {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_INVALID_STATUS, "rd item is not accepted", 400);
    }

    const targetStage = this.requireStage(input.stageId.trim());
    if (targetStage.projectId !== current.projectId) {
      throw new AppError(ERROR_CODES.RD_STAGE_PROJECT_MISMATCH, "rd stage project mismatch", 400);
    }
    if (!targetStage.enabled) {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_INVALID_TARGET, "rd target stage is disabled", 400);
    }

    if (current.stageId === targetStage.id) {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_INVALID_TARGET, "rd target stage must be different", 400);
    }

    const currentStage = current.stageId ? this.requireStage(current.stageId) : null;
    if (!this.hasNextAvailableStage(current.projectId, currentStage)) {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_INVALID_TARGET, "rd item already in last stage", 400);
    }
    if (currentStage && !this.isStageAfter(current.projectId, currentStage.id, targetStage.id)) {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_INVALID_TARGET, "rd target stage must be after current stage", 400);
    }
    const nextMembersRef =
      input.memberIds === undefined
        ? {
            memberIds: this.collectEffectiveMemberIds(current.memberIds, current.assigneeId),
            memberNames: await this.resolveMemberNamesFallback(
              current.projectId,
              this.collectEffectiveMemberIds(current.memberIds, current.assigneeId)
            ),
            verifierId: current.verifierId,
            verifierName: current.verifierName
          }
        : await this.resolveMembers(current.projectId, input.memberIds, current.verifierId);
    const nextAssigneeId = nextMembersRef.memberIds.length > 0 ? nextMembersRef.memberIds[0] : null;
    const nextAssigneeName = nextMembersRef.memberNames.length > 0 ? nextMembersRef.memberNames[0] : null;
    const description = input.description?.trim();
    const nextPlanStartAt = input.planStartAt?.trim() || null;
    const nextPlanEndAt = input.planEndAt?.trim() || null;
    if (nextPlanStartAt && nextPlanEndAt) {
      const startAt = Date.parse(nextPlanStartAt);
      const endAt = Date.parse(nextPlanEndAt);
      if (Number.isFinite(startAt) && Number.isFinite(endAt) && startAt > endAt) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "rd planStartAt must be earlier than or equal to planEndAt", 400);
      }
    }
    const selectedInitialStageTasks = input.stageTasks === undefined
      ? []
      : await this.resolveInitialStageTasks(
          current.projectId,
          targetStage.id,
          input.stageTasks,
          nextMembersRef.memberIds,
          nextPlanStartAt,
          nextPlanEndAt
        );
    const selectedTemplateTasks = input.stageTasks === undefined ? await this.resolveStageTaskTemplateSelections(
      current.projectId,
      targetStage.id,
      input.stageTaskTemplates ?? []
    ) : [];

    const fromStageName = currentStage?.name || "未归类";
    const currentMemberNames = await this.resolveMemberNamesFallback(current.projectId, current.memberIds);
    const advanceAt = nowIso();
    const operatorId = ctx.userId?.trim() || ctx.accountId;
    const operatorName = ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId;
    const entity = this.repo.transaction(() => {
      const updated = this.repo.updateItem(id, {
        stage_id: targetStage.id,
        status: "todo",
        member_ids: JSON.stringify(nextMembersRef.memberIds),
        assignee_id: nextAssigneeId,
        assignee_name: nextAssigneeName,
        plan_start_at: nextPlanStartAt,
        plan_end_at: nextPlanEndAt,
        progress: 0,
        actual_start_at: null,
        actual_end_at: null,
        blocker_reason: null,
        updated_at: advanceAt
      });
      if (!updated) {
        throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_FAILED, "failed to advance rd stage", 500);
      }
      this.repo.deleteProgressByItemId(id);
      this.ensureMemberProgressRows(id, nextMembersRef.memberIds, advanceAt);
      if (selectedTemplateTasks.length > 0) {
        this.initializeStageTasksFromTemplates(current.projectId, id, selectedTemplateTasks, advanceAt);
      }
      if (selectedInitialStageTasks.length > 0) {
        this.initializeStageTasks(current.projectId, id, selectedInitialStageTasks, advanceAt);
      }

      const advanced = this.requireItem(id);
      this.repo.createStageHistory({
        id: genId("rdsh"),
        projectId: advanced.projectId,
        itemId: advanced.id,
        fromStageId: current.stageId,
        fromStageName,
        toStageId: targetStage.id,
        toStageName: targetStage.name,
        snapshotJson: JSON.stringify({
          stageId: current.stageId,
          stageName: fromStageName,
          status: current.status,
          progress: current.progress,
          assigneeId: current.assigneeId,
          assigneeName: current.assigneeName,
          verifierId: current.verifierId,
          verifierName: current.verifierName,
          memberIds: current.memberIds,
          memberNames: currentMemberNames,
          planStartAt: current.planStartAt,
          planEndAt: current.planEndAt,
          actualStartAt: current.actualStartAt,
          actualEndAt: current.actualEndAt,
          blockerReason: current.blockerReason
        }),
        operatorId,
        operatorName,
        createdAt: advanceAt
      });
      this.repo.createLog(
        this.createLog(
          advanced,
          "advance_stage",
          ctx,
          `推进阶段: ${fromStageName} -> ${targetStage.name}` +
            (nextMembersRef.memberNames.length > 0 ? `；成员: ${nextMembersRef.memberNames.join("、")}` : "；成员: 未指定") +
            ((nextPlanStartAt || nextPlanEndAt) ? `；计划: ${nextPlanStartAt || "-"} ~ ${nextPlanEndAt || "-"}` : "") +
            (description ? `；说明: ${description}` : "")
        )
      );
      return advanced;
    });
    await this.emitRdEvent("rd.updated", "advance_stage", entity, ctx);
    return this.withVerifierFallback(entity);
  }

  async listItems(query: ListRdItemsQuery, ctx: RequestContext): Promise<RdItemListResult> {
    const stageIds = query.stageIds ?? (query.stageId?.trim() ? [query.stageId.trim()] : []);
    const assigneeIds = query.assigneeIds ?? (query.assigneeId?.trim() ? [query.assigneeId.trim()] : []);
    const normalizedQuery: ListRdItemsQuery = {
      ...query,
      stageIds,
      assigneeIds,
      stageId: stageIds.length > 0 ? undefined : query.stageId,
      assigneeId: assigneeIds.length > 0 ? undefined : query.assigneeId,
      sortBy: query.sortBy ?? "createdAt",
      sortOrder: query.sortOrder ?? "desc",
    };

    if (query.projectId?.trim()) {
      await this.projectAccess.requireProjectAccess(query.projectId.trim(), ctx, "list rd items");
      const result = this.repo.listItems(normalizedQuery, [query.projectId.trim()]);
      return {
        ...result,
        items: result.items.map((item) => this.withVerifierFallback(item))
      };
    }

    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    const result = this.repo.listItems(normalizedQuery, projectIds);
    return {
      ...result,
      items: result.items.map((item) => this.withVerifierFallback(item))
    };
  }

  async getItemById(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    return this.withVerifierFallback(await this.requireItemWithAccess(id, ctx, "get rd item"));
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
    return this.withVerifierFallback(item);
  }

  private requireStageTask(id: string): RdStageTaskEntity {
    const task = this.repo.findStageTaskById(id);
    if (!task) {
      throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, `rd stage task not found: ${id}`, 404);
    }
    return task;
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

    if (item.creatorId === userId) {
      return;
    }

    throw new AppError(ERROR_CODES.RD_EDIT_FORBIDDEN, `${action} forbidden`, 403);
  }

  private async requireStageTaskEditAccess(
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

  private async requireCloseAccess(item: RdItemEntity, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.RD_CLOSE_FORBIDDEN, `${action} forbidden`, 403);
    }

    if (item.creatorId === userId) {
      return;
    }

    throw new AppError(ERROR_CODES.RD_CLOSE_FORBIDDEN, `${action} forbidden`, 403);
  }

  private async requireAdvanceAccess(item: RdItemEntity, ctx: RequestContext, action: string): Promise<void> {
    const userId = ctx.userId?.trim();
    const effectiveVerifierId = this.getEffectiveVerifierId(item);
    if (!userId || !effectiveVerifierId || effectiveVerifierId !== userId) {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_FORBIDDEN, `${action} forbidden`, 403);
    }
  }

  private requireAssignee(item: RdItemEntity, ctx: RequestContext, action: string): void {
    const userId = ctx.userId?.trim();
    if (!userId || !item.assigneeId || item.assigneeId !== userId) {
      throw new AppError(ERROR_CODES.RD_PROGRESS_FORBIDDEN, `${action} forbidden`, 403);
    }
  }

  private requireCompleteAccess(item: RdItemEntity, ctx: RequestContext, action: string): void {
    if (this.isVerifier(item, ctx)) {
      return;
    }
    throw new AppError(ERROR_CODES.RD_PROGRESS_FORBIDDEN, `${action} forbidden`, 403);
  }

  private isVerifier(item: Pick<RdItemEntity, "verifierId" | "creatorId">, ctx: RequestContext): boolean {
    const userId = ctx.userId?.trim();
    const effectiveVerifierId = this.getEffectiveVerifierId(item);
    return !!userId && !!effectiveVerifierId && effectiveVerifierId === userId;
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

  private requireProgressMember(item: RdItemEntity, targetUserId: string, action: string): void {
    const memberIds = new Set([...(item.memberIds ?? []), ...(item.assigneeId ? [item.assigneeId] : [])]);
    if (!memberIds.has(targetUserId)) {
      throw new AppError(ERROR_CODES.RD_PROGRESS_FORBIDDEN, `${action} forbidden`, 403);
    }
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
    memberIds: string[],
    verifierId: string | null | undefined
  ): Promise<RdMemberRef> {
    const normalizedMemberIds = this.collectEffectiveMemberIds(memberIds);
    if (normalizedMemberIds.length === 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd memberIds requires at least one member", 400);
    }
    const memberNames: string[] = [];
    let normalizedVerifierId = verifierId?.trim() || null;
    let verifierName: string | null = null;

    for (const memberId of normalizedMemberIds) {
      const member = await this.projectAccess.requireProjectMember(projectId, memberId, "resolve rd member");
      memberNames.push(member.displayName);
    }

    if (normalizedVerifierId) {
      const verifier = await this.projectAccess.requireProjectMember(projectId, normalizedVerifierId, "resolve rd verifier");
      normalizedVerifierId = verifier.userId;
      verifierName = verifier.displayName;
    }

    return {
      memberIds: normalizedMemberIds,
      memberNames,
      verifierId: normalizedVerifierId,
      verifierName
    };
  }

  private collectEffectiveMemberIds(memberIds: string[] | null | undefined, fallbackAssigneeId?: string | null): string[] {
    const sourceIds = Array.isArray(memberIds) ? memberIds : [];
    const all = [...sourceIds, fallbackAssigneeId ?? ""];
    return Array.from(new Set(all.map((id) => id.trim()).filter(Boolean)));
  }

  private ensureMemberProgressRows(itemId: string, memberIds: string[], updatedAt: string): void {
    const existingIds = new Set(this.repo.listProgressByItemId(itemId).map((row) => row.user_id));
    for (const memberId of this.collectEffectiveMemberIds(memberIds)) {
      if (existingIds.has(memberId)) {
        continue;
      }
      this.repo.upsertProgress({
        id: genId("rdp"),
        item_id: itemId,
        user_id: memberId,
        progress: 0,
        note: null,
        updated_at: updatedAt,
      });
      existingIds.add(memberId);
    }
  }

  private async resolveMemberNamesFallback(projectId: string, memberIds: string[]): Promise<string[]> {
    const names: string[] = [];
    for (const memberId of memberIds) {
      if (!memberId?.trim()) {
        continue;
      }
      try {
        const member = await this.projectAccess.requireProjectMember(projectId, memberId.trim(), "resolve rd member fallback");
        names.push(member.displayName);
      } catch {
        names.push(memberId.trim());
      }
    }
    return names;
  }

  private async createMemberProgressOverview(item: RdItemEntity): Promise<{ summary: string; hasIncomplete: boolean }> {
    const memberIds = this.collectEffectiveMemberIds(item.memberIds, item.assigneeId);
    if (memberIds.length === 0) {
      return { summary: "", hasIncomplete: false };
    }
    const names = await this.resolveMemberNamesFallback(item.projectId, memberIds);
    const taskProgress = this.calculateCurrentStageTaskAssignmentProgress(item);
    const storedProgressByUser = new Map(this.repo.listProgressByItemId(item.id).map((row) => [row.user_id, row.progress]));
    const progressByUser = taskProgress.totalAssignments > 0 ? taskProgress.progressByUser : storedProgressByUser;
    const progressValues = memberIds.map((memberId) => progressByUser.get(memberId) ?? 0);
    const summary = memberIds
      .map((memberId, index) => `${names[index] || memberId} ${progressByUser.get(memberId) ?? 0}%`)
      .join("、");
    return {
      summary,
      hasIncomplete: progressValues.some((progress) => progress < 100)
    };
  }

  private createCurrentStageTaskProgressOverview(item: RdItemEntity): { summary: string; hasIncomplete: boolean } {
    const taskProgress = this.calculateCurrentStageTaskAssignmentProgress(item);
    if (taskProgress.totalAssignments === 0) {
      return { summary: "", hasIncomplete: false };
    }
    return {
      summary: `${taskProgress.completedAssignments}/${taskProgress.totalAssignments} 已完成`,
      hasIncomplete: taskProgress.completedAssignments < taskProgress.totalAssignments
    };
  }

  private async resolveStageTaskOwners(
    projectId: string,
    ownerIds: string[] | undefined,
    ownerId: string | null | undefined,
    ownerName: string | null | undefined
  ): Promise<ResolvedStageTaskOwners> {
    const normalizedIds =
      ownerIds === undefined
        ? (ownerId?.trim() ? [ownerId.trim()] : [])
        : [...new Set(ownerIds.map((item) => item.trim()).filter(Boolean))];
    if (normalizedIds.length === 0) {
      return {
        ownerId: null,
        ownerName: ownerName?.trim() || null,
        ownerIds: [],
        ownerNames: []
      };
    }
    const ownerNames: string[] = [];
    for (const id of normalizedIds) {
      const member = await this.projectAccess.requireProjectMember(projectId, id, "resolve rd stage task owner");
      ownerNames.push(member.displayName);
    }
    return {
      ownerId: normalizedIds[0] ?? null,
      ownerName: ownerNames[0] ?? null,
      ownerIds: normalizedIds,
      ownerNames
    };
  }

  private createStageTaskOwnerRows(
    task: Pick<RdStageTaskEntity, "id" | "projectId" | "itemId" | "ownerIds" | "ownerNames" | "status" | "progress" | "startedAt" | "completedAt">,
    createdAt: string,
    existingByUserId: Map<string, RdStageTaskEntity["ownerProgresses"][number]> = new Map()
  ) {
    return task.ownerIds.map((userId, index) => ({
      id: existingByUserId.get(userId)?.id ?? genId("rdsto"),
      taskId: task.id,
      projectId: task.projectId,
      itemId: task.itemId,
      userId,
      userName: task.ownerNames[index] ?? userId,
      status: existingByUserId.get(userId)?.status ?? task.status,
      progress: existingByUserId.get(userId)?.progress ?? task.progress,
      startedAt: existingByUserId.get(userId)?.startedAt ?? task.startedAt,
      completedAt: existingByUserId.get(userId)?.completedAt ?? task.completedAt,
      createdAt: existingByUserId.get(userId)?.createdAt ?? createdAt,
      updatedAt: createdAt
    }));
  }

  private resolveStageTaskProgress(status: RdStageTaskEntity["status"], progress: number | undefined): number {
    if (status === "done") {
      return 100;
    }
    if (status === "pending") {
      return Math.min(99, Math.max(0, Number(progress ?? 0) || 0));
    }
    if (status === "cancelled") {
      return Math.max(0, Math.min(100, Number(progress ?? 0) || 0));
    }
    return Math.max(0, Math.min(99, Number(progress ?? 0) || 0));
  }

  private resolveStageTaskStateFromOwnerProgress(
    itemId: string,
    ownerIds: string[],
    updatedAt: string
  ): Pick<RdStageTaskEntity, "status" | "progress" | "startedAt" | "completedAt"> {
    const normalizedOwnerIds = [...new Set(ownerIds.map((id) => id.trim()).filter(Boolean))];
    if (normalizedOwnerIds.length === 0) {
      return {
        status: "pending",
        progress: 0,
        startedAt: null,
        completedAt: null
      };
    }
    const progressByUser = new Map(this.repo.listProgressByItemId(itemId).map((row) => [row.user_id, row.progress]));
    const highestProgress = normalizedOwnerIds.reduce((max, ownerId) => Math.max(max, progressByUser.get(ownerId) ?? 0), 0);
    if (highestProgress >= 100) {
      return {
        status: "done",
        progress: 100,
        startedAt: updatedAt,
        completedAt: updatedAt
      };
    }
    if (highestProgress > 0) {
      return {
        status: "in_progress",
        progress: Math.min(99, Math.max(1, highestProgress)),
        startedAt: updatedAt,
        completedAt: null
      };
    }
    return {
      status: "pending",
      progress: 0,
      startedAt: null,
      completedAt: null
    };
  }

  private resolveStageTaskOwnerStatus(progress: number, blockReason: string | null): RdStageTaskEntity["status"] {
    if (blockReason) {
      return "blocked";
    }
    if (progress >= 100) {
      return "done";
    }
    if (progress > 0) {
      return "in_progress";
    }
    return "pending";
  }

  private updateStageTaskAggregateFromOwners(taskId: string, updatedAt: string): void {
    const task = this.requireStageTask(taskId);
    if (task.status === "cancelled") {
      return;
    }
    const owners = task.ownerProgresses.filter((owner) => owner.status !== "cancelled");
    if (owners.length === 0) {
      return;
    }
    const progressSum = owners.reduce((sum, owner) => sum + Math.max(0, Math.min(100, Number(owner.progress) || 0)), 0);
    const completedCount = owners.filter((owner) => owner.status === "done" || owner.progress >= 100).length;
    const progress =
      progressSum <= 0
        ? 0
        : completedCount >= owners.length
          ? 100
          : Math.min(99, Math.max(1, Math.floor(progressSum / owners.length)));
    const status: RdStageTaskEntity["status"] =
      completedCount >= owners.length
        ? "done"
        : owners.some((owner) => owner.status === "blocked")
          ? "blocked"
          : owners.some((owner) => owner.status === "in_progress" || owner.status === "done" || owner.progress > 0)
            ? "in_progress"
            : "pending";
    this.repo.updateStageTask(taskId, {
      status,
      progress,
      started_at: task.startedAt || (progress > 0 ? updatedAt : null),
      completed_at: status === "done" ? task.completedAt || updatedAt : null,
      updated_at: updatedAt
    });
  }

  private syncStageTaskOwnerProgressFromTaskState(
    taskId: string,
    status: RdStageTaskEntity["status"],
    progress: number,
    startedAt: string | null,
    completedAt: string | null,
    updatedAt: string
  ): void {
    const task = this.requireStageTask(taskId);
    for (const owner of task.ownerProgresses) {
      const nextStartedAt = owner.startedAt || startedAt || (progress > 0 ? updatedAt : null);
      const nextCompletedAt = status === "done" ? owner.completedAt || completedAt || updatedAt : status === "cancelled" ? owner.completedAt : null;
      const ok = this.repo.updateStageTaskOwnerProgress(taskId, owner.userId, {
        status,
        progress,
        started_at: nextStartedAt,
        completed_at: nextCompletedAt,
        updated_at: updatedAt
      });
      if (!ok) {
        throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to sync rd stage task owner progress", 500);
      }
    }
  }

  private calculateMainProgressFromMembers(
    item: Pick<RdItemEntity, "memberIds" | "assigneeId">,
    progressByUser: Map<string, number>
  ): number {
    const effectiveMemberIds = this.collectEffectiveMemberIds(item.memberIds, item.assigneeId);
    if (effectiveMemberIds.length === 0) {
      return 0;
    }
    const values = effectiveMemberIds.map((memberId) => progressByUser.get(memberId) ?? 0);
    const hasStarted = values.some((value) => value > 0);
    const hasIncomplete = values.some((value) => value < 100);
    const progress = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    if (!hasStarted) {
      return 0;
    }
    if (!hasIncomplete) {
      return 100;
    }
    return Math.min(99, Math.max(1, progress));
  }

  private listCurrentStageActiveTasks(item: RdItemEntity): RdStageTaskEntity[] {
    const stage = item.stageId ? this.repo.findStageById(item.stageId) : null;
    const currentStageKey = stage ? resolveRdStageKey(stage) : "";
    if (!currentStageKey) {
      return [];
    }
    return this.repo
      .listStageTasksByItemId(item.id)
      .filter((task) => task.stageKey === currentStageKey)
      .filter((task) => task.status !== "cancelled");
  }

  private calculateCurrentStageTaskAssignmentProgress(item: RdItemEntity): {
    totalAssignments: number;
    progressSum: number;
    completedAssignments: number;
    progressByUser: Map<string, number>;
  } {
    const tasks = this.listCurrentStageActiveTasks(item);
    const progressSumByUser = new Map<string, number>();
    const countByUser = new Map<string, number>();
    let totalAssignments = 0;
    let progressSum = 0;
    let completedAssignments = 0;

    for (const task of tasks) {
      if (task.ownerProgresses.length > 0) {
        for (const owner of task.ownerProgresses.filter((item) => item.status !== "cancelled")) {
          const ownerProgress = Math.max(0, Math.min(100, Number(owner.progress) || 0));
          totalAssignments += 1;
          progressSum += ownerProgress;
          if (owner.status === "done" || ownerProgress >= 100) {
            completedAssignments += 1;
          }
          progressSumByUser.set(owner.userId, (progressSumByUser.get(owner.userId) ?? 0) + ownerProgress);
          countByUser.set(owner.userId, (countByUser.get(owner.userId) ?? 0) + 1);
        }
        continue;
      }

      const ownerIds = [...new Set((task.ownerIds?.length ? task.ownerIds : task.ownerId ? [task.ownerId] : []).map((id) => id.trim()).filter(Boolean))];
      const taskProgress = Math.max(0, Math.min(100, Number(task.progress) || 0));
      const assignmentCount = ownerIds.length || 1;
      totalAssignments += assignmentCount;
      progressSum += taskProgress * assignmentCount;
      if (task.status === "done" || taskProgress >= 100) {
        completedAssignments += assignmentCount;
      }
      for (const ownerId of ownerIds) {
        progressSumByUser.set(ownerId, (progressSumByUser.get(ownerId) ?? 0) + taskProgress);
        countByUser.set(ownerId, (countByUser.get(ownerId) ?? 0) + 1);
      }
    }

    const progressByUser = new Map<string, number>();
    for (const [userId, total] of progressSumByUser.entries()) {
      const count = countByUser.get(userId) ?? 0;
      const progress =
        count <= 0 || total <= 0
          ? 0
          : total >= count * 100
            ? 100
            : Math.min(99, Math.max(1, Math.floor(total / count)));
      progressByUser.set(userId, progress);
    }

    return {
      totalAssignments,
      progressSum,
      completedAssignments,
      progressByUser
    };
  }

  private calculateMainProgress(item: RdItemEntity, progressByUser: Map<string, number>): number {
    const taskProgress = this.calculateCurrentStageTaskAssignmentProgress(item);
    if (taskProgress.totalAssignments > 0) {
      if (taskProgress.progressSum <= 0) {
        return 0;
      }
      if (taskProgress.completedAssignments >= taskProgress.totalAssignments) {
        return 100;
      }
      return Math.min(99, Math.max(1, Math.floor(taskProgress.progressSum / taskProgress.totalAssignments)));
    }

    return this.calculateMainProgressFromMembers(item, progressByUser);
  }

  private createItemProgressUpdatePayload(
    item: RdItemEntity,
    mainProgress: number,
    updatedAt: string
  ): Record<string, unknown> {
    const updatePayload: Record<string, unknown> = {
      progress: mainProgress,
      updated_at: updatedAt
    };
    if (mainProgress >= 100 && (item.status === "todo" || item.status === "doing" || item.status === "blocked")) {
      updatePayload.status = "done";
      updatePayload.actual_start_at = item.actualStartAt ?? updatedAt;
      updatePayload.actual_end_at = updatedAt;
      updatePayload.blocker_reason = null;
    } else if (mainProgress > 0 && item.status === "todo") {
      updatePayload.status = "doing";
      updatePayload.actual_start_at = item.actualStartAt ?? updatedAt;
      updatePayload.actual_end_at = null;
    } else if (mainProgress < 100 && item.status === "done") {
      updatePayload.status = "doing";
      updatePayload.actual_end_at = null;
    }
    return updatePayload;
  }

  private refreshItemProgressByCurrentStageTasks(item: RdItemEntity, updatedAt: string): RdItemEntity {
    const current = this.requireItem(item.id);
    const progressRows = this.repo.listProgressByItemId(current.id);
    const progressByUser = new Map(progressRows.map((row) => [row.user_id, row.progress]));
    const mainProgress = this.calculateMainProgress(current, progressByUser);
    this.repo.updateItem(current.id, this.createItemProgressUpdatePayload(current, mainProgress, updatedAt));
    return this.requireItem(current.id);
  }

  private ensureCurrentStageBaselineTasksBeforeFirstExplicitTask(item: RdItemEntity, stageKey: string, createdAt: string): void {
    const stage = item.stageId ? this.repo.findStageById(item.stageId) : null;
    const currentStageKey = stage ? resolveRdStageKey(stage) : "";
    if (!stage || !currentStageKey || stageKey !== currentStageKey) {
      return;
    }
    const existingTasks = this.listCurrentStageActiveTasks(item);
    if (existingTasks.length > 0) {
      return;
    }
    const progressRows = this.repo.listProgressByItemId(item.id);
    const progressByUser = new Map(progressRows.map((row) => [row.user_id, row.progress]));
    const memberIds = this.collectEffectiveMemberIds(item.memberIds, item.assigneeId);
    for (const memberId of memberIds) {
      const progress = Math.max(0, Math.min(100, progressByUser.get(memberId) ?? 0));
      const ownerName = memberId === item.assigneeId ? item.assigneeName : null;
      const status: RdStageTaskEntity["status"] = progress >= 100 ? "done" : progress > 0 ? "in_progress" : "pending";
      const task: RdStageTaskEntity = {
        id: genId("rdst"),
        projectId: item.projectId,
        itemId: item.id,
        stageKey,
        title: `${stage.name}阶段任务`,
        description: null,
        status,
        ownerId: memberId,
        ownerName,
        ownerIds: [memberId],
        ownerNames: [ownerName ?? memberId],
        ownerProgresses: [],
        progress,
        plannedStartAt: null,
        plannedEndAt: null,
        startedAt: progress > 0 ? createdAt : null,
        completedAt: progress >= 100 ? createdAt : null,
        sortOrder: this.repo.getNextStageTaskSortOrder(item.id, stageKey),
        remark: null,
        createdAt,
        updatedAt: createdAt
      };
      this.repo.createStageTask(task);
      this.repo.replaceStageTaskOwners(task, this.createStageTaskOwnerRows(task, createdAt));
    }
  }

  private validateStageTaskPlanRange(plannedStartAt: string | null, plannedEndAt: string | null): void {
    if (!plannedStartAt || !plannedEndAt) {
      return;
    }
    const startAt = Date.parse(plannedStartAt);
    const endAt = Date.parse(plannedEndAt);
    if (Number.isFinite(startAt) && Number.isFinite(endAt) && startAt > endAt) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task plannedStartAt must be earlier than plannedEndAt", 400);
    }
  }

  private validateInitialStageTaskPlanRange(
    plannedStartAt: string | null,
    plannedEndAt: string | null,
    itemPlanStartAt: string | null,
    itemPlanEndAt: string | null
  ): void {
    this.validateStageTaskPlanRange(plannedStartAt, plannedEndAt);
    if (!plannedStartAt && !plannedEndAt) {
      return;
    }
    if (!itemPlanStartAt || !itemPlanEndAt) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task plan requires rd item plan range", 400);
    }
    const itemStart = Date.parse(itemPlanStartAt);
    const itemEnd = Date.parse(itemPlanEndAt);
    const taskStart = plannedStartAt ? Date.parse(plannedStartAt) : null;
    const taskEnd = plannedEndAt ? Date.parse(plannedEndAt) : null;
    if (!Number.isFinite(itemStart) || !Number.isFinite(itemEnd)) {
      return;
    }
    if (Number.isFinite(taskStart) && (taskStart! < itemStart || taskStart! > itemEnd)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task plannedStartAt must be within rd item plan range", 400);
    }
    if (Number.isFinite(taskEnd) && (taskEnd! < itemStart || taskEnd! > itemEnd)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task plannedEndAt must be within rd item plan range", 400);
    }
  }

  private async resolveStageTaskTemplateSelections(
    projectId: string,
    targetStageId: string | null,
    selections: RdStageTaskTemplateSelectionInput[]
  ): Promise<ResolvedStageTaskTemplateSelection[]> {
    const normalizedSelections = this.normalizeStageTaskTemplateSelections(selections);
    if (normalizedSelections.length === 0) {
      return [];
    }
    if (!targetStageId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task template requires target stage", 400);
    }
    const templateIds = normalizedSelections.map((item) => item.templateId);
    const templates = this.repo.listStageTaskTemplatesByIds(templateIds);
    if (templates.length !== templateIds.length) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task template not found", 400);
    }
    const templateById = new Map(templates.map((template) => [template.id, template]));
    const result: ResolvedStageTaskTemplateSelection[] = [];
    for (const selection of normalizedSelections) {
      const template = templateById.get(selection.templateId);
      if (!template || template.projectId !== projectId || template.stageId !== targetStageId || !template.enabled) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task template does not match target stage", 400);
      }
      if (!selection.ownerId) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task template owner is required", 400);
      }
      const owner = await this.resolveStageTaskOwners(projectId, undefined, selection.ownerId, null);
      result.push({
        template,
        ownerId: owner.ownerId,
        ownerName: owner.ownerName
      });
    }
    return result;
  }

  private normalizeStageTaskTemplateSelections(
    selections: RdStageTaskTemplateSelectionInput[]
  ): Array<{ templateId: string; ownerId: string | null }> {
    const result: Array<{ templateId: string; ownerId: string | null }> = [];
    const seen = new Set<string>();
    for (const selection of selections) {
      const templateId = selection.templateId?.trim();
      if (!templateId || seen.has(templateId)) {
        continue;
      }
      seen.add(templateId);
      result.push({
        templateId,
        ownerId: selection.ownerId?.trim() || null
      });
    }
    return result;
  }

  private async resolveInitialStageTasks(
    projectId: string,
    targetStageId: string | null,
    tasks: RdInitialStageTaskInput[],
    memberIds: string[],
    itemPlanStartAt: string | null,
    itemPlanEndAt: string | null
  ): Promise<ResolvedInitialStageTask[]> {
    const normalizedTasks = tasks
      .map((task) => ({
        templateId: task.templateId?.trim() || null,
        title: task.title?.trim() || "",
        description: task.description === undefined ? undefined : task.description?.trim() || null,
        ownerId: task.ownerId?.trim() || null,
        plannedStartAt: task.plannedStartAt?.trim() || null,
        plannedEndAt: task.plannedEndAt?.trim() || null
      }))
      .filter((task) => task.title);
    if (!targetStageId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task requires target stage", 400);
    }
    const targetStage = this.repo.findStageById(targetStageId);
    if (!targetStage || targetStage.projectId !== projectId || !targetStage.enabled) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task target stage is unavailable", 400);
    }
    const allowedOwnerIds = new Set(memberIds);
    const templateIds = [...new Set(normalizedTasks.map((task) => task.templateId).filter((id): id is string => !!id))];
    const templates = templateIds.length > 0 ? this.repo.listStageTaskTemplatesByIds(templateIds) : [];
    if (templates.length !== templateIds.length) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task template not found", 400);
    }
    const templateById = new Map(templates.map((template) => [template.id, template]));
    const result: ResolvedInitialStageTask[] = [];
    for (const task of normalizedTasks) {
      if (!task.ownerId || !allowedOwnerIds.has(task.ownerId)) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task owner must be selected rd item member", 400);
      }
      const template = task.templateId ? templateById.get(task.templateId) : null;
      if (task.templateId && (!template || template.projectId !== projectId || template.stageId !== targetStageId || !template.enabled)) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task template does not match target stage", 400);
      }
      this.validateInitialStageTaskPlanRange(task.plannedStartAt, task.plannedEndAt, itemPlanStartAt, itemPlanEndAt);
      const owner = await this.resolveStageTaskOwners(projectId, undefined, task.ownerId, null);
      result.push({
        stageKey: resolveRdStageKey(targetStage),
        title: task.title,
        description: task.description !== undefined ? task.description : template?.description ?? null,
        ownerId: owner.ownerId,
        ownerName: owner.ownerName,
        plannedStartAt: task.plannedStartAt,
        plannedEndAt: task.plannedEndAt
      });
    }
    const existingOwnerIds = new Set(result.map((task) => task.ownerId).filter((ownerId): ownerId is string => !!ownerId));
    for (const memberId of memberIds) {
      if (existingOwnerIds.has(memberId)) {
        continue;
      }
      const owner = await this.resolveStageTaskOwners(projectId, undefined, memberId, null);
      result.push({
        stageKey: resolveRdStageKey(targetStage),
        title: `${targetStage.name}阶段任务`,
        description: null,
        ownerId: owner.ownerId,
        ownerName: owner.ownerName,
        plannedStartAt: null,
        plannedEndAt: null
      });
    }
    return result;
  }

  private initializeStageTasksFromTemplates(
    projectId: string,
    itemId: string,
    selections: ResolvedStageTaskTemplateSelection[],
    createdAt: string
  ): void {
    let sortOrderByStageKey = new Map<string, number>();
    for (const selection of selections) {
      const template = selection.template;
      const nextSortOrder = sortOrderByStageKey.get(template.stageKey) ?? this.repo.getNextStageTaskSortOrder(itemId, template.stageKey);
      const ownerIds = selection.ownerId ? [selection.ownerId] : [];
      const ownerNames = selection.ownerName ? [selection.ownerName] : selection.ownerId ? [selection.ownerId] : [];
      const state = this.resolveStageTaskStateFromOwnerProgress(itemId, ownerIds, createdAt);
      const task: RdStageTaskEntity = {
        id: genId("rdst"),
        projectId,
        itemId,
        stageKey: template.stageKey,
        title: template.title,
        description: template.description,
        status: state.status,
        ownerId: selection.ownerId,
        ownerName: selection.ownerName,
        ownerIds,
        ownerNames,
        ownerProgresses: [],
        progress: state.progress,
        plannedStartAt: null,
        plannedEndAt: null,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
        sortOrder: nextSortOrder,
        remark: null,
        createdAt,
        updatedAt: createdAt
      };
      this.repo.createStageTask(task);
      this.repo.replaceStageTaskOwners(task, this.createStageTaskOwnerRows(task, createdAt));
      sortOrderByStageKey = new Map(sortOrderByStageKey).set(template.stageKey, nextSortOrder + 10);
    }
  }

  private initializeStageTasks(
    projectId: string,
    itemId: string,
    tasks: ResolvedInitialStageTask[],
    createdAt: string
  ): void {
    let sortOrderByStageKey = new Map<string, number>();
    for (const taskInput of tasks) {
      const nextSortOrder = sortOrderByStageKey.get(taskInput.stageKey) ?? this.repo.getNextStageTaskSortOrder(itemId, taskInput.stageKey);
      const ownerIds = taskInput.ownerId ? [taskInput.ownerId] : [];
      const ownerNames = taskInput.ownerName ? [taskInput.ownerName] : taskInput.ownerId ? [taskInput.ownerId] : [];
      const state = this.resolveStageTaskStateFromOwnerProgress(itemId, ownerIds, createdAt);
      const task: RdStageTaskEntity = {
        id: genId("rdst"),
        projectId,
        itemId,
        stageKey: taskInput.stageKey,
        title: taskInput.title,
        description: taskInput.description,
        status: state.status,
        ownerId: taskInput.ownerId,
        ownerName: taskInput.ownerName,
        ownerIds,
        ownerNames,
        ownerProgresses: [],
        progress: state.progress,
        plannedStartAt: taskInput.plannedStartAt,
        plannedEndAt: taskInput.plannedEndAt,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
        sortOrder: nextSortOrder,
        remark: null,
        createdAt,
        updatedAt: createdAt
      };
      this.repo.createStageTask(task);
      this.repo.replaceStageTaskOwners(task, this.createStageTaskOwnerRows(task, createdAt));
      sortOrderByStageKey = new Map(sortOrderByStageKey).set(taskInput.stageKey, nextSortOrder + 10);
    }
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

  private async createUpdateLogContent(current: RdItemEntity, input: UpdateRdItemInput): Promise<string> {
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

  private async createMemberChangeLogContent(projectId: string, currentMemberIds: string[], nextMemberIds: string[]): Promise<string> {
    const currentIds = this.collectEffectiveMemberIds(currentMemberIds);
    const nextIds = this.collectEffectiveMemberIds(nextMemberIds);
    const currentSet = new Set(currentIds);
    const nextSet = new Set(nextIds);
    const addedIds = nextIds.filter((id) => !currentSet.has(id));
    const removedIds = currentIds.filter((id) => !nextSet.has(id));
    const parts: string[] = [];
    if (addedIds.length > 0) {
      const names = await this.resolveMemberNamesFallback(projectId, addedIds);
      parts.push(`新增执行人: ${names.join("、")}`);
    }
    if (removedIds.length > 0) {
      const names = await this.resolveMemberNamesFallback(projectId, removedIds);
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

  async updateProgress(id: string, input: UpdateRdItemProgressInput, ctx: RequestContext): Promise<RdItemEntity> {
    const item = await this.requireItemWithAccess(id, ctx, "update rd progress");
    const previousStatus = item.status;
    if (item.status === "accepted" || item.status === "closed") {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "cannot update progress for accepted or closed rd item", 400);
    }
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.RD_PROGRESS_FORBIDDEN, "update rd progress forbidden", 403);
    }
    this.requireProgressMember(item, userId, "update rd progress");
    const now = nowIso();

    const existing = this.repo.getProgressByItemAndUser(id, userId);
    const nextNote = input.note?.trim() || null;
    const currentNote = existing?.note?.trim() || null;
    const blockReason = input.blockReason?.trim() || null;
    const resolveBlockId = input.resolveBlockId?.trim() || null;
    if (blockReason && resolveBlockId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "cannot block and resolve member block in one request", 400);
    }
    const stageTaskId = input.stageTaskId?.trim() || null;
    const stageTask = stageTaskId ? this.requireStageTask(stageTaskId) : null;
    const stageTaskOwner = stageTask?.ownerProgresses.find((owner) => owner.userId === userId) ?? null;
    if (stageTask) {
      if (stageTask.itemId !== item.id || stageTask.status === "cancelled") {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task does not match current rd item", 400);
      }
      const currentStage = item.stageId ? this.repo.findStageById(item.stageId) : null;
      const currentStageKey = currentStage ? resolveRdStageKey(currentStage) : "";
      if (currentStageKey && stageTask.stageKey !== currentStageKey) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task does not match current stage", 400);
      }
      if (!stageTaskOwner) {
        throw new AppError(ERROR_CODES.RD_PROGRESS_FORBIDDEN, "update rd stage task owner progress forbidden", 403);
      }
    }
    const oldProgress = stageTaskOwner?.progress ?? existing?.progress ?? 0;
    const progressChanged = oldProgress !== input.progress || currentNote !== nextNote;
    if (resolveBlockId) {
      const block = this.repo.findMemberBlockById(resolveBlockId);
      if (!block || block.itemId !== item.id) {
        throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, "rd member block not found", 404);
      }
      if (block.userId !== userId) {
        throw new AppError(ERROR_CODES.RD_BLOCK_FORBIDDEN, "resolve rd member block forbidden", 403);
      }
    }

    if (!progressChanged && !blockReason && !resolveBlockId) {
      return item;
    }

    const blockMember = blockReason
      ? await this.projectAccess.requireProjectMember(item.projectId, userId, "create rd member block")
      : null;
    const progressNote = nextNote;
    const isStartProcessing = oldProgress <= 0 && input.progress > 0;
    const progressLogContent = progressChanged
      ? (isStartProcessing
          ? (progressNote
              ? `开始处理；进度: ${oldProgress}% -> ${input.progress}%；说明：${progressNote}`
              : `开始处理；进度: ${oldProgress}% -> ${input.progress}%`)
          : (progressNote
              ? `更新个人进度: ${oldProgress}% -> ${input.progress}%；说明：${progressNote}`
              : `更新个人进度: ${oldProgress}% -> ${input.progress}%`))
      : "";
    const updatedItem = this.repo.transaction(() => {
      if (stageTask && (progressChanged || blockReason || resolveBlockId)) {
        const ownerStatus = this.resolveStageTaskOwnerStatus(input.progress, blockReason);
        const ownerStartedAt = stageTaskOwner?.startedAt || (input.progress > 0 ? now : null);
        const ownerCompletedAt = ownerStatus === "done" ? stageTaskOwner?.completedAt || now : null;
        const ownerUpdated = this.repo.updateStageTaskOwnerProgress(stageTask.id, userId, {
          status: ownerStatus,
          progress: input.progress,
          started_at: ownerStartedAt,
          completed_at: ownerCompletedAt,
          updated_at: now
        });
        if (!ownerUpdated) {
          throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to update rd stage task owner progress", 500);
        }
        this.updateStageTaskAggregateFromOwners(stageTask.id, now);
      }

      if (progressChanged) {
        const progressItem = this.requireItem(id);
        const taskProgress = this.calculateCurrentStageTaskAssignmentProgress(progressItem);
        const memberProgress = taskProgress.totalAssignments > 0
          ? (taskProgress.progressByUser.get(userId) ?? input.progress)
          : input.progress;
        this.repo.upsertProgress({
          id: existing ? existing.id : genId("rdp"),
          item_id: id,
          user_id: userId,
          progress: memberProgress,
          note: nextNote,
          updated_at: now
        });

        this.repo.createProgressHistory({
          id: genId("rdph"),
          item_id: id,
          user_id: userId,
          old_progress: oldProgress,
          new_progress: input.progress,
          note: nextNote,
          created_at: now
        });
      }

      const allProgressRows = this.repo.listProgressByItemId(id);
      const progressByUser = new Map(allProgressRows.map((row) => [row.user_id, row.progress]));
      const latestItem = this.requireItem(id);
      const mainProgress = this.calculateMainProgress(latestItem, progressByUser);

      const updated = this.repo.updateItem(id, {
        ...this.createItemProgressUpdatePayload(latestItem, mainProgress, now)
      }, latestItem.version);

      if (!updated) {
        throw new AppError(ERROR_CODES.RD_ITEM_VERSION_CONFLICT, "rd item version conflict", 409);
      }

      const transactionUpdatedItem = this.requireItem(id);
      const blockLogContent = this.applyProgressMemberBlockChange(transactionUpdatedItem, userId, blockReason, resolveBlockId, ctx, blockMember);
      const logContent = [progressLogContent, blockLogContent].filter(Boolean).join("；");
      this.repo.createLog(this.createLog(transactionUpdatedItem, "update", ctx, logContent || "更新个人进度"));
      return transactionUpdatedItem;
    });
    const memberBlockEventAction = resolveBlockId ? "resume" : (blockReason ? "block" : "");
    const eventAction = previousStatus !== "done" && updatedItem.status === "done" ? "complete" : (memberBlockEventAction || "update_progress");
    await this.emitRdEvent("rd.updated", eventAction, updatedItem, ctx);
    return updatedItem;
  }

  private applyProgressMemberBlockChange(
    item: RdItemEntity,
    userId: string,
    blockReason: string | null,
    resolveBlockId: string | null,
    ctx: RequestContext,
    blockMember: { userId: string; displayName: string } | null
  ): string {
    if (resolveBlockId) {
      const block = this.repo.findMemberBlockById(resolveBlockId);
      if (!block || block.itemId !== item.id) {
        throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, "rd member block not found", 404);
      }
      if (block.userId !== userId) {
        throw new AppError(ERROR_CODES.RD_BLOCK_FORBIDDEN, "resolve rd member block forbidden", 403);
      }
      if (block.status !== "active") {
        return "";
      }
      const resolved = this.repo.resolveMemberBlock(block.id, {
        resolved_at: nowIso(),
        resolved_by_id: userId || ctx.accountId,
        resolved_by_name: ctx.nickname?.trim() || userId || ctx.accountId,
        resolve_note: null,
      });
      if (!resolved) {
        throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to resolve rd member block", 500);
      }
      return "解除阻塞";
    }

    if (!blockReason) {
      return "";
    }
    const active = this.repo.findActiveMemberBlock(item.id, userId);
    if (active) {
      return "";
    }
    if (!blockMember) {
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to resolve rd member", 500);
    }
    this.repo.createMemberBlock({
      id: genId("rdmb"),
      project_id: item.projectId,
      item_id: item.id,
      user_id: blockMember.userId,
      user_name: blockMember.displayName,
      reason: blockReason,
      status: "active",
      blocked_at: nowIso(),
      resolved_at: null,
      resolved_by_id: null,
      resolved_by_name: null,
      resolve_note: null,
    });
    return `标记阻塞：${blockReason}`;
  }

  async createMemberBlock(id: string, input: CreateRdMemberBlockInput, ctx: RequestContext): Promise<RdMemberBlockEntity> {
    const item = await this.requireItemWithAccess(id, ctx, "create rd member block");
    if (item.status === "done" || item.status === "accepted" || item.status === "closed") {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "cannot block completed rd item", 400);
    }
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.RD_BLOCK_FORBIDDEN, "create rd member block forbidden", 403);
    }
    this.requireProgressMember(item, userId, "create rd member block");

    const active = this.repo.findActiveMemberBlock(id, userId);
    if (active) {
      return active;
    }

    const member = await this.projectAccess.requireProjectMember(item.projectId, userId, "create rd member block");
    const now = nowIso();
    const block = {
      id: genId("rdmb"),
      project_id: item.projectId,
      item_id: item.id,
      user_id: member.userId,
      user_name: member.displayName,
      reason: input.reason.trim(),
      status: "active" as const,
      blocked_at: now,
      resolved_at: null,
      resolved_by_id: null,
      resolved_by_name: null,
      resolve_note: null,
    };
    this.repo.createMemberBlock(block);
    const entity = this.repo.findMemberBlockById(block.id);
    if (!entity) {
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to create rd member block", 500);
    }
    this.repo.createLog(this.createLog(item, "block", ctx, `${member.displayName} 标记阻塞：${block.reason}`));
    await this.emitRdEvent("rd.updated", "block", item, ctx);
    return entity;
  }

  async resolveMemberBlock(id: string, blockId: string, input: ResolveRdMemberBlockInput, ctx: RequestContext): Promise<RdMemberBlockEntity> {
    const item = await this.requireItemWithAccess(id, ctx, "resolve rd member block");
    const block = this.repo.findMemberBlockById(blockId);
    if (!block || block.itemId !== item.id) {
      throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, "rd member block not found", 404);
    }
    if (block.status !== "active") {
      return block;
    }
    const userId = ctx.userId?.trim();
    if (!userId || (block.userId !== userId && !this.isVerifier(item, ctx))) {
      throw new AppError(ERROR_CODES.RD_BLOCK_FORBIDDEN, "resolve rd member block forbidden", 403);
    }
    const resolverName = ctx.nickname?.trim() || userId || ctx.accountId;
    const resolved = this.repo.resolveMemberBlock(block.id, {
      resolved_at: nowIso(),
      resolved_by_id: userId || ctx.accountId,
      resolved_by_name: resolverName,
      resolve_note: input.note?.trim() || null,
    });
    if (!resolved) {
      const latest = this.repo.findMemberBlockById(block.id);
      if (latest) {
        return latest;
      }
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to resolve rd member block", 500);
    }
    const entity = this.repo.findMemberBlockById(block.id);
    if (!entity) {
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to resolve rd member block", 500);
    }
    const note = input.note?.trim();
    this.repo.createLog(
      this.createLog(item, "resume", ctx, note ? `解除 ${block.userName || block.userId} 的阻塞：${note}` : `解除 ${block.userName || block.userId} 的阻塞`)
    );
    await this.emitRdEvent("rd.updated", "resume", item, ctx);
    return entity;
  }

  async listProgress(id: string, ctx: RequestContext): Promise<RdItemProgress[]> {
    const item = await this.requireItemWithAccess(id, ctx, "list rd progress");
    const rows = this.repo.listProgressByItemId(id);
    const taskProgress = this.calculateCurrentStageTaskAssignmentProgress(item);
    const rowByUser = new Map(rows.map((row) => [row.user_id, row]));
    const userIds = new Set([
      ...rows.map((row) => row.user_id),
      ...this.collectEffectiveMemberIds(item.memberIds, item.assigneeId)
    ]);
    return [...userIds].map(userId => {
      const row = rowByUser.get(userId);
      return {
        id: row?.id ?? `derived-${id}-${userId}`,
        itemId: id,
        userId,
        userName: null,
        progress: taskProgress.totalAssignments > 0 ? (taskProgress.progressByUser.get(userId) ?? 0) : (row?.progress ?? 0),
        note: row?.note ?? null,
        updatedAt: row?.updated_at ?? item.updatedAt
      };
    });
  }

  async listProgressHistory(id: string, ctx: RequestContext): Promise<RdProgressHistory[]> {
    await this.requireItemWithAccess(id, ctx, "list rd progress history");
    const rows = this.repo.listProgressHistoryByItemId(id);
    return rows.map(row => ({
      id: row.id,
      itemId: row.item_id,
      userId: row.user_id,
      userName: null,
      oldProgress: row.old_progress,
      newProgress: row.new_progress,
      note: row.note,
      createdAt: row.created_at
    }));
  }

  async listMemberBlocks(id: string, ctx: RequestContext): Promise<RdMemberBlockEntity[]> {
    await this.requireItemWithAccess(id, ctx, "list rd member blocks");
    return this.repo.listMemberBlocksByItemId(id);
  }

  async listStageHistory(id: string, ctx: RequestContext): Promise<RdStageHistoryEntry[]> {
    await this.requireItemWithAccess(id, ctx, "list rd stage history");
    return this.repo.listStageHistoryByItemId(id);
  }

  async listStageTasks(id: string, ctx: RequestContext): Promise<RdStageTaskEntity[]> {
    await this.requireItemWithAccess(id, ctx, "list rd stage tasks");
    return this.repo.listStageTasksByItemId(id);
  }

  async createStageTask(id: string, input: CreateRdStageTaskInput, ctx: RequestContext): Promise<RdStageTaskEntity> {
    const item = await this.requireItemWithAccess(id, ctx, "create rd stage task");
    await this.requireBasicEditAccess(item, ctx, "create rd stage task");
    const now = nowIso();
    const owner = await this.resolveStageTaskOwners(item.projectId, input.ownerIds, input.ownerId, input.ownerName);
    if (owner.ownerIds.length === 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task owner is required", 400);
    }
    const stageKey = input.stageKey.trim();
    const title = input.title.trim();
    const plannedStartAt = input.plannedStartAt?.trim() || null;
    const plannedEndAt = input.plannedEndAt?.trim() || null;
    this.validateStageTaskPlanRange(plannedStartAt, plannedEndAt);
    const entity = this.repo.transaction(() => {
      this.ensureCurrentStageBaselineTasksBeforeFirstExplicitTask(item, stageKey, now);
      const status = input.status ?? "pending";
      const createdEntity: RdStageTaskEntity = {
        id: genId("rdst"),
        projectId: item.projectId,
        itemId: item.id,
        stageKey,
        title,
        description: input.description?.trim() || null,
        status,
        ownerId: owner.ownerId,
        ownerName: owner.ownerName,
        ownerIds: owner.ownerIds,
        ownerNames: owner.ownerNames,
        progress: this.resolveStageTaskProgress(status, input.progress),
        plannedStartAt,
        plannedEndAt,
        startedAt: input.startedAt?.trim() || (status === "in_progress" || status === "done" ? now : null),
        completedAt: input.completedAt?.trim() || (status === "done" ? now : null),
        sortOrder: input.sortOrder ?? this.repo.getNextStageTaskSortOrder(item.id, stageKey),
        remark: input.remark?.trim() || null,
        createdAt: now,
        updatedAt: now,
        ownerProgresses: []
      };
      this.repo.createStageTask(createdEntity);
      this.repo.replaceStageTaskOwners(createdEntity, this.createStageTaskOwnerRows(createdEntity, now));
      this.refreshItemProgressByCurrentStageTasks(item, now);
      return createdEntity;
    });
    this.repo.createLog(this.createLog(this.requireItem(item.id), "update", ctx, `新增阶段任务：${entity.title}`));
    await this.emitRdEvent("rd.updated", "stage_task_created", this.requireItem(item.id), ctx);
    return entity;
  }

  async updateStageTask(taskId: string, input: UpdateRdStageTaskInput, ctx: RequestContext): Promise<RdStageTaskEntity> {
    const task = this.requireStageTask(taskId);
    const item = await this.requireItemWithAccess(task.itemId, ctx, "update rd stage task");
    await this.requireStageTaskEditAccess(item, task, ctx, "update rd stage task");
    const now = nowIso();
    const owner = await this.resolveStageTaskOwners(
      item.projectId,
      input.ownerIds,
      input.ownerId === undefined ? task.ownerId : input.ownerId,
      input.ownerName === undefined ? task.ownerName : input.ownerName
    );
    const ownerChanged = input.ownerIds !== undefined || input.ownerId !== undefined || input.ownerName !== undefined;
    if (ownerChanged && owner.ownerIds.length === 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task owner is required", 400);
    }
    const taskProgressChanged =
      input.status !== undefined ||
      input.progress !== undefined ||
      input.startedAt !== undefined ||
      input.completedAt !== undefined;
    const nextStatus = input.status ?? task.status;
    const nextProgress = this.resolveStageTaskProgress(nextStatus, input.progress ?? task.progress);
    const startedAt =
      input.startedAt === undefined
        ? (task.startedAt || (nextStatus === "in_progress" || nextStatus === "done" ? now : null))
        : input.startedAt?.trim() || null;
    const completedAt =
      input.completedAt === undefined
        ? (nextStatus === "done" ? task.completedAt || now : nextStatus === "cancelled" ? task.completedAt : null)
        : input.completedAt?.trim() || null;
    const plannedStartAt = input.plannedStartAt === undefined ? task.plannedStartAt : input.plannedStartAt?.trim() || null;
    const plannedEndAt = input.plannedEndAt === undefined ? task.plannedEndAt : input.plannedEndAt?.trim() || null;
    this.validateStageTaskPlanRange(plannedStartAt, plannedEndAt);
    const updated = this.repo.transaction(() => {
      const ok = this.repo.updateStageTask(task.id, {
        stage_key: input.stageKey?.trim() || task.stageKey,
        title: input.title?.trim() || task.title,
        description: input.description === undefined ? task.description : input.description?.trim() || null,
        status: nextStatus,
        owner_id: owner.ownerId,
        owner_name: owner.ownerName,
        progress: nextProgress,
        planned_start_at: plannedStartAt,
        planned_end_at: plannedEndAt,
        started_at: startedAt,
        completed_at: completedAt,
        sort_order: input.sortOrder ?? task.sortOrder,
        remark: input.remark === undefined ? task.remark : input.remark?.trim() || null,
        updated_at: now
      });
      if (!ok) {
        return false;
      }
      if (ownerChanged) {
        const ownerTask = {
          ...task,
          ownerIds: owner.ownerIds,
          ownerNames: owner.ownerNames,
          status: taskProgressChanged ? nextStatus : "pending" as RdStageTaskEntity["status"],
          progress: taskProgressChanged ? nextProgress : 0,
          startedAt: taskProgressChanged ? startedAt : null,
          completedAt: taskProgressChanged ? completedAt : null
        };
        const existingOwnerProgressByUserId = new Map(task.ownerProgresses.map((row) => [row.userId, row]));
        this.repo.replaceStageTaskOwners(
          { id: task.id, projectId: task.projectId, itemId: task.itemId },
          this.createStageTaskOwnerRows(ownerTask, now, existingOwnerProgressByUserId)
        );
      }
      if (taskProgressChanged) {
        this.syncStageTaskOwnerProgressFromTaskState(task.id, nextStatus, nextProgress, startedAt, completedAt, now);
      }
      if (ownerChanged || taskProgressChanged) {
        this.updateStageTaskAggregateFromOwners(task.id, now);
      }
      this.refreshItemProgressByCurrentStageTasks(item, now);
      return true;
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to update rd stage task", 500);
    }
    const entity = this.requireStageTask(task.id);
    this.repo.createLog(this.createLog(item, "update", ctx, `更新阶段任务：${entity.title}`));
    await this.emitRdEvent("rd.updated", "stage_task_updated", this.requireItem(item.id), ctx);
    return entity;
  }

  async cancelStageTask(taskId: string, ctx: RequestContext): Promise<RdStageTaskEntity> {
    return this.updateStageTask(taskId, { status: "cancelled" }, ctx);
  }

  private async emitRdEvent(type: string, action: string, item: RdItemEntity, ctx: RequestContext): Promise<void> {
    await this.eventBus.emit({
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

  private hasNextAvailableStage(projectId: string, currentStage: RdStageEntity | null): boolean {
    const enabledStages = this.listOrderedEnabledStages(projectId);
    if (enabledStages.length === 0) {
      return false;
    }
    if (!currentStage) {
      return enabledStages.length > 0;
    }
    const currentIndex = enabledStages.findIndex((stage) => stage.id === currentStage.id);
    if (currentIndex < 0) {
      return enabledStages.length > 0;
    }
    return currentIndex < enabledStages.length - 1;
  }

  private isStageAfter(projectId: string, fromStageId: string, toStageId: string): boolean {
    const enabledStages = this.listOrderedEnabledStages(projectId);
    const fromIndex = enabledStages.findIndex((stage) => stage.id === fromStageId);
    const toIndex = enabledStages.findIndex((stage) => stage.id === toStageId);
    if (fromIndex < 0 || toIndex < 0) {
      return false;
    }
    return toIndex > fromIndex;
  }

  private listOrderedEnabledStages(projectId: string): RdStageEntity[] {
    return this.repo
      .listStages(projectId)
      .filter((stage) => stage.enabled)
      .sort((a, b) => {
        if (a.sort !== b.sort) {
          return a.sort - b.sort;
        }
        const aCreated = Date.parse(a.createdAt || "");
        const bCreated = Date.parse(b.createdAt || "");
        if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
          return aCreated - bCreated;
        }
        return a.id.localeCompare(b.id);
      });
  }

  private getReopenStatusByProgress(progress: number): RdItemEntity["status"] {
    const normalized = Math.max(0, Math.min(100, Number(progress) || 0));
    if (normalized >= 100) {
      return "done";
    }
    if (normalized > 0) {
      return "doing";
    }
    return "todo";
  }

  private getEffectiveVerifierId(item: Pick<RdItemEntity, "verifierId" | "creatorId">): string | null {
    return item.verifierId?.trim() || item.creatorId?.trim() || null;
  }

  private withVerifierFallback(item: RdItemEntity): RdItemEntity {
    const effectiveVerifierId = this.getEffectiveVerifierId(item);
    const effectiveVerifierName = item.verifierName?.trim() || item.creatorName?.trim() || null;
    if (item.verifierId === effectiveVerifierId && item.verifierName === effectiveVerifierName) {
      return item;
    }
    return {
      ...item,
      verifierId: effectiveVerifierId,
      verifierName: effectiveVerifierName
    };
  }
}
