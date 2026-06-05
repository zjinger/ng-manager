import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import { resolveRdStageKey } from "../rd-stage-task-templates";
import type {
  CreateRdMemberBlockInput,
  RdItemEntity,
  RdItemProgress,
  RdMemberBlockEntity,
  RdProgressHistory,
  RdStageTaskEntity,
  ResolveRdMemberBlockInput,
  UpdateRdItemProgressInput
} from "../rd.types";
import type { RdEventService } from "./rd-event.service";
import type { RdLogService } from "./rd-log.service";
import type { RdMemberService } from "./rd-member.service";
import type { RdPermissionService } from "./rd-permission.service";
import type { RdServiceContext } from "./rd-service-context";

export class RdProgressService {
  constructor(
    private readonly context: RdServiceContext,
    private readonly member: RdMemberService,
    private readonly permission: RdPermissionService,
    private readonly log: RdLogService,
    private readonly event: RdEventService
  ) {}

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
    this.permission.requireProgressMember(item, userId, "update rd progress");
    const now = nowIso();

    const existing = this.context.repo.getProgressByItemAndUser(id, userId);
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
      const currentStage = item.stageId ? this.context.repo.findStageById(item.stageId) : null;
      const currentStageKey = currentStage ? resolveRdStageKey(currentStage) : "";
      if (currentStageKey && stageTask.stageKey !== currentStageKey) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task does not match current stage", 400);
      }
      if (!stageTaskOwner || stageTaskOwner.status === "cancelled") {
        throw new AppError(ERROR_CODES.RD_PROGRESS_FORBIDDEN, "update rd stage task owner progress forbidden", 403);
      }
    } else if (this.listCurrentStageActiveTasks(item).length > 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "stageTaskId is required when current stage has stage tasks", 400);
    }
    const oldProgress = stageTaskOwner?.progress ?? existing?.progress ?? 0;
    const progressChanged = oldProgress !== input.progress || currentNote !== nextNote;
    if (resolveBlockId) {
      const block = this.context.repo.findMemberBlockById(resolveBlockId);
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
      ? await this.context.projectAccess.requireProjectMember(item.projectId, userId, "create rd member block")
      : null;
    const progressNote = nextNote;
    const isStartProcessing = oldProgress <= 0 && input.progress > 0;
    const taskTitle = stageTask?.title.trim() || "";
    const actionText = isStartProcessing
      ? (taskTitle ? `开始处理任务「${taskTitle}」` : "开始处理")
      : (taskTitle ? `更新任务「${taskTitle}」进度` : "更新个人进度");
    const progressLogContent = progressChanged
      ? (isStartProcessing
          ? (progressNote
              ? `${actionText}；进度: ${oldProgress}% -> ${input.progress}%；说明：${progressNote}`
              : `${actionText}；进度: ${oldProgress}% -> ${input.progress}%`)
          : (progressNote
              ? `${actionText}: ${oldProgress}% -> ${input.progress}%；说明：${progressNote}`
              : `${actionText}: ${oldProgress}% -> ${input.progress}%`))
      : "";
    const updatedItem = this.context.repo.transaction(() => {
      if (stageTask && (progressChanged || blockReason || resolveBlockId)) {
        const ownerStatus = this.resolveStageTaskOwnerStatus(input.progress, blockReason);
        const ownerStartedAt = stageTaskOwner?.startedAt || (input.progress > 0 ? now : null);
        const ownerCompletedAt = ownerStatus === "done" ? stageTaskOwner?.completedAt || now : null;
        const ownerUpdated = this.context.repo.updateStageTaskOwnerProgress(stageTask.id, userId, {
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
        this.context.repo.upsertProgress({
          id: existing ? existing.id : genId("rdp"),
          item_id: id,
          user_id: userId,
          progress: memberProgress,
          note: nextNote,
          updated_at: now
        });

        this.context.repo.createProgressHistory({
          id: genId("rdph"),
          item_id: id,
          user_id: userId,
          old_progress: oldProgress,
          new_progress: input.progress,
          note: nextNote,
          created_at: now
        });
      }

      const allProgressRows = this.context.repo.listProgressByItemId(id);
      const progressByUser = new Map(allProgressRows.map((row) => [row.user_id, row.progress]));
      const latestItem = this.requireItem(id);
      const mainProgress = this.calculateMainProgress(latestItem, progressByUser);

      const updated = this.context.repo.updateItem(id, {
        ...this.createItemProgressUpdatePayload(latestItem, mainProgress, now)
      }, latestItem.version);

      if (!updated) {
        throw new AppError(ERROR_CODES.RD_ITEM_VERSION_CONFLICT, "rd item version conflict", 409);
      }

      const transactionUpdatedItem = this.requireItem(id);
      const blockLogContent = this.applyProgressMemberBlockChange(transactionUpdatedItem, userId, blockReason, resolveBlockId, ctx, blockMember);
      const logContent = [progressLogContent, blockLogContent].filter(Boolean).join("；");
      this.context.repo.createLog(this.log.createLog(transactionUpdatedItem, "update", ctx, logContent || "更新个人进度"));
      return transactionUpdatedItem;
    });
    const memberBlockEventAction = resolveBlockId ? "resume" : (blockReason ? "block" : "");
    const eventAction = previousStatus !== "done" && updatedItem.status === "done" ? "complete" : (memberBlockEventAction || "update_progress");
    await this.event.emitRdEvent("rd.updated", eventAction, updatedItem, ctx);
    return updatedItem;
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
    this.permission.requireProgressMember(item, userId, "create rd member block");

    const active = this.context.repo.findActiveMemberBlock(id, userId);
    if (active) {
      return active;
    }

    const member = await this.context.projectAccess.requireProjectMember(item.projectId, userId, "create rd member block");
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
    this.context.repo.createMemberBlock(block);
    const entity = this.context.repo.findMemberBlockById(block.id);
    if (!entity) {
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to create rd member block", 500);
    }
    this.context.repo.createLog(this.log.createLog(item, "block", ctx, `${member.displayName} 标记阻塞：${block.reason}`));
    await this.event.emitRdEvent("rd.updated", "block", item, ctx);
    return entity;
  }

  async resolveMemberBlock(id: string, blockId: string, input: ResolveRdMemberBlockInput, ctx: RequestContext): Promise<RdMemberBlockEntity> {
    const item = await this.requireItemWithAccess(id, ctx, "resolve rd member block");
    const block = this.context.repo.findMemberBlockById(blockId);
    if (!block || block.itemId !== item.id) {
      throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, "rd member block not found", 404);
    }
    if (block.status !== "active") {
      return block;
    }
    const userId = ctx.userId?.trim();
    if (!userId || (block.userId !== userId && !this.member.isVerifier(item, ctx))) {
      throw new AppError(ERROR_CODES.RD_BLOCK_FORBIDDEN, "resolve rd member block forbidden", 403);
    }
    const resolverName = ctx.nickname?.trim() || userId || ctx.accountId;
    const resolved = this.context.repo.resolveMemberBlock(block.id, {
      resolved_at: nowIso(),
      resolved_by_id: userId || ctx.accountId,
      resolved_by_name: resolverName,
      resolve_note: input.note?.trim() || null,
    });
    if (!resolved) {
      const latest = this.context.repo.findMemberBlockById(block.id);
      if (latest) {
        return latest;
      }
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to resolve rd member block", 500);
    }
    const entity = this.context.repo.findMemberBlockById(block.id);
    if (!entity) {
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to resolve rd member block", 500);
    }
    const note = input.note?.trim();
    this.context.repo.createLog(
      this.log.createLog(item, "resume", ctx, note ? `解除 ${block.userName || block.userId} 的阻塞：${note}` : `解除 ${block.userName || block.userId} 的阻塞`)
    );
    await this.event.emitRdEvent("rd.updated", "resume", item, ctx);
    return entity;
  }

  async listProgress(id: string, ctx: RequestContext): Promise<RdItemProgress[]> {
    const item = await this.requireItemWithAccess(id, ctx, "list rd progress");
    const rows = this.context.repo.listProgressByItemId(id);
    const taskProgress = this.calculateCurrentStageTaskAssignmentProgress(item);
    const rowByUser = new Map(rows.map((row) => [row.user_id, row]));
    const userIds = new Set([
      ...rows.map((row) => row.user_id),
      ...this.member.collectEffectiveMemberIds(item.memberIds, item.assigneeId)
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
    const rows = this.context.repo.listProgressHistoryByItemId(id);
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
    return this.context.repo.listMemberBlocksByItemId(id);
  }

  private requireItem(id: string): RdItemEntity {
    const item = this.context.repo.findItemById(id);
    if (!item) {
      throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, `rd item not found: ${id}`, 404);
    }
    return this.member.withVerifierFallback(item);
  }

  private requireStageTask(id: string): RdStageTaskEntity {
    const task = this.context.repo.findStageTaskById(id);
    if (!task) {
      throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, `rd stage task not found: ${id}`, 404);
    }
    return task;
  }

  private async requireItemWithAccess(id: string, ctx: RequestContext, action: string): Promise<RdItemEntity> {
    const item = this.requireItem(id);
    await this.context.projectAccess.requireProjectAccess(item.projectId, ctx, action);
    return item;
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
      const block = this.context.repo.findMemberBlockById(resolveBlockId);
      if (!block || block.itemId !== item.id) {
        throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, "rd member block not found", 404);
      }
      if (block.userId !== userId) {
        throw new AppError(ERROR_CODES.RD_BLOCK_FORBIDDEN, "resolve rd member block forbidden", 403);
      }
      if (block.status !== "active") {
        return "";
      }
      const resolved = this.context.repo.resolveMemberBlock(block.id, {
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
    const active = this.context.repo.findActiveMemberBlock(item.id, userId);
    if (active) {
      return "";
    }
    if (!blockMember) {
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to resolve rd member", 500);
    }
    this.context.repo.createMemberBlock({
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
    this.context.repo.updateStageTask(taskId, {
      status,
      progress,
      started_at: task.startedAt || (progress > 0 ? updatedAt : null),
      completed_at: status === "done" ? task.completedAt || updatedAt : null,
      updated_at: updatedAt
    });
  }

  private calculateMainProgressFromMembers(
    item: Pick<RdItemEntity, "memberIds" | "assigneeId">,
    progressByUser: Map<string, number>
  ): number {
    const effectiveMemberIds = this.member.collectEffectiveMemberIds(item.memberIds, item.assigneeId);
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
    const stage = item.stageId ? this.context.repo.findStageById(item.stageId) : null;
    const currentStageKey = stage ? resolveRdStageKey(stage) : "";
    if (!currentStageKey) {
      return [];
    }
    return this.context.repo
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
}
