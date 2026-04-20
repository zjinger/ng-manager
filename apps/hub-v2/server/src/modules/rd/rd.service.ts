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
  CloseRdItemInput,
  CreateRdItemInput,
  CreateRdStageInput,
  ListRdItemsQuery,
  ListRdStagesQuery,
  RdAction,
  RdDashboardActivity,
  RdDashboardTodo,
  RdItemEntity,
  RdItemListResult,
  RdItemProgress,
  RdLogEntity,
  RdProgressHistory,
  RdStageHistoryEntry,
  RdStageEntity,
  UpdateRdItemInput,
  UpdateRdItemProgressInput,
  UpdateRdStageInput
} from "./rd.types";

type RdMemberRef = {
  memberIds: string[];
  memberNames: string[];
  verifierId: string | null;
  verifierName: string | null;
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
      input.memberIds === undefined ? this.collectEffectiveMemberIds(current.memberIds, current.assigneeId) : input.memberIds,
      input.verifierId === undefined ? current.verifierId : input.verifierId
    );
    const memberIds = members.memberIds;
    const assigneeId = memberIds.length > 0 ? memberIds[0] : current.assigneeId;
    const assigneeName = memberIds.length > 0 ? members.memberNames[0] : current.assigneeName;
    const stageId =
      input.stageId === undefined ? current.stageId : await this.resolveStageId(current.projectId, input.stageId);
    const updated = this.repo.updateItem(id, {
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

  async reopen(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "reopen rd item");
    await this.requireCloseAccess(current, ctx, "reopen rd item");
    return this.applyAction(
      id,
      "reopen",
      ctx,
      current,
      {
        blocker_reason: null,
        actual_end_at: null
      },
      "恢复研发项"
    );
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
    if (currentStage && targetStage.sort <= currentStage.sort) {
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
    const nextPlanStartAt = input.planStartAt?.trim() || current.planStartAt || null;
    const nextPlanEndAt = input.planEndAt?.trim() || current.planEndAt || null;
    if (nextPlanStartAt && nextPlanEndAt) {
      const startAt = Date.parse(nextPlanStartAt);
      const endAt = Date.parse(nextPlanEndAt);
      if (Number.isFinite(startAt) && Number.isFinite(endAt) && startAt > endAt) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "rd planStartAt must be earlier than or equal to planEndAt", 400);
      }
    }

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
      updated_at: nowIso()
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_FAILED, "failed to advance rd stage", 500);
    }
    // 进入新阶段后，成员个人进度从 0 重新开始，避免沿用上一阶段进度快照。
    this.repo.deleteProgressByItemId(id);

    const entity = this.requireItem(id);
    const fromStageName = currentStage?.name || "未归类";
    this.repo.createStageHistory({
      id: genId("rdsh"),
      projectId: entity.projectId,
      itemId: entity.id,
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
        memberNames: await this.resolveMemberNamesFallback(current.projectId, current.memberIds),
        planStartAt: current.planStartAt,
        planEndAt: current.planEndAt,
        actualStartAt: current.actualStartAt,
        actualEndAt: current.actualEndAt,
        blockerReason: current.blockerReason
      }),
      operatorId: ctx.userId?.trim() || ctx.accountId,
      operatorName: ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId,
      createdAt: nowIso()
    });
    this.repo.createLog(
      this.createLog(
        entity,
        "advance_stage",
        ctx,
        `推进阶段: ${fromStageName} -> ${targetStage.name}` +
          (nextMembersRef.memberNames.length > 0 ? `；成员: ${nextMembersRef.memberNames.join("、")}` : "；成员: 未指定") +
          ((nextPlanStartAt || nextPlanEndAt) ? `；计划: ${nextPlanStartAt || "-"} ~ ${nextPlanEndAt || "-"}` : "") +
          (description ? `；说明: ${description}` : "")
      )
    );
    await this.emitRdEvent("rd.updated", "advance_stage", entity, ctx);
    return entity;
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

    if (item.creatorId === userId) {
      return;
    }

    throw new AppError(ERROR_CODES.RD_EDIT_FORBIDDEN, `${action} forbidden`, 403);
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
    if (!userId || !item.verifierId || item.verifierId !== userId) {
      throw new AppError(ERROR_CODES.RD_ADVANCE_STAGE_FORBIDDEN, `${action} forbidden`, 403);
    }
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
    if (input.memberIds !== undefined) {
      const currentIds = current.memberIds ?? [];
      const nextIds = input.memberIds ?? [];
      if (currentIds.length !== nextIds.length || currentIds.some((id, index) => id !== nextIds[index])) {
        changes.push("更新成员");
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
    const oldProgress = existing?.progress ?? 0;

    this.repo.upsertProgress({
      id: existing ? existing.id : genId("rdp"),
      item_id: id,
      user_id: userId,
      progress: input.progress,
      note: input.note || null,
      updated_at: now
    });

    this.repo.createProgressHistory({
      id: genId("rdph"),
      item_id: id,
      user_id: userId,
      old_progress: oldProgress,
      new_progress: input.progress,
      note: input.note || null,
      created_at: now
    });

    const allProgressRows = this.repo.listProgressByItemId(id);
    const progressByUser = new Map(allProgressRows.map((row) => [row.user_id, row.progress]));
    const effectiveMemberIds = this.collectEffectiveMemberIds(item.memberIds, item.assigneeId);
    const memberCount = effectiveMemberIds.length;
    const mainProgress =
      memberCount === 0
        ? 0
        : Math.round(
            effectiveMemberIds.reduce((sum, memberId) => sum + (progressByUser.get(memberId) ?? 0), 0) / memberCount
          );

    const updatePayload: Record<string, unknown> = {
      progress: mainProgress,
      updated_at: now
    };
    if (mainProgress >= 100 && (item.status === "todo" || item.status === "doing" || item.status === "blocked")) {
      updatePayload.status = "done";
      updatePayload.actual_start_at = item.actualStartAt ?? now;
      updatePayload.actual_end_at = now;
      updatePayload.blocker_reason = null;
    } else if (mainProgress > 0 && item.status === "todo") {
      updatePayload.status = "doing";
      updatePayload.actual_start_at = item.actualStartAt ?? now;
      updatePayload.actual_end_at = null;
    } else if (mainProgress < 100 && item.status === "done") {
      updatePayload.status = "doing";
      updatePayload.actual_end_at = null;
    }

    const updated = this.repo.updateItem(id, {
      ...updatePayload
    }, item.version);

    if (!updated) {
      throw new AppError(ERROR_CODES.RD_ITEM_VERSION_CONFLICT, "rd item version conflict", 409);
    }

    const updatedItem = this.requireItem(id);
    const progressNote = input.note?.trim();
    const isStartProcessing = oldProgress <= 0 && input.progress > 0;
    const progressLogContent = isStartProcessing
      ? (progressNote
          ? `开始处理；进度: ${oldProgress}% -> ${input.progress}%；说明：${progressNote}`
          : `开始处理；进度: ${oldProgress}% -> ${input.progress}%`)
      : (progressNote
          ? `更新个人进度: ${oldProgress}% -> ${input.progress}%；说明：${progressNote}`
          : `更新个人进度: ${oldProgress}% -> ${input.progress}%`);
    this.repo.createLog(this.createLog(updatedItem, "update", ctx, progressLogContent));
    const eventAction = previousStatus !== "done" && updatedItem.status === "done" ? "complete" : "update_progress";
    await this.emitRdEvent("rd.updated", eventAction, updatedItem, ctx);
    return updatedItem;
  }

  async listProgress(id: string, ctx: RequestContext): Promise<RdItemProgress[]> {
    await this.requireItemWithAccess(id, ctx, "list rd progress");
    const rows = this.repo.listProgressByItemId(id);
    return rows.map(row => ({
      id: row.id,
      itemId: row.item_id,
      userId: row.user_id,
      userName: null,
      progress: row.progress,
      note: row.note,
      updatedAt: row.updated_at
    }));
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

  async listStageHistory(id: string, ctx: RequestContext): Promise<RdStageHistoryEntry[]> {
    await this.requireItemWithAccess(id, ctx, "list rd stage history");
    return this.repo.listStageHistoryByItemId(id);
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
    const enabledStages = this.repo
      .listStages(projectId)
      .filter((stage) => stage.enabled)
      .sort((a, b) => a.sort - b.sort);
    if (enabledStages.length === 0) {
      return false;
    }
    if (!currentStage) {
      return enabledStages.length > 0;
    }
    return enabledStages.some((stage) => stage.sort > currentStage.sort);
  }
}
