import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import { resolveRdStageKey } from "../rd-stage-task-templates";
import type {
  CreateRdStageTaskInput,
  RdItemEntity,
  RdStageHistoryEntry,
  RdStageTaskEntity,
  UpdateRdStageTaskInput
} from "../rd.types";
import type { RdEventService } from "./rd-event.service";
import type { RdLogService } from "./rd-log.service";
import type { RdMemberService } from "./rd-member.service";
import type { RdPermissionService } from "./rd-permission.service";
import type { RdServiceContext } from "./rd-service-context";

type ResolvedStageTaskOwners = {
  ownerId: string | null;
  ownerName: string | null;
  ownerIds: string[];
  ownerNames: string[];
};

export class RdStageTaskService {
  constructor(
    private readonly context: RdServiceContext,
    private readonly member: RdMemberService,
    private readonly permission: RdPermissionService,
    private readonly log: RdLogService,
    private readonly event: RdEventService
  ) {}

  async listStageHistory(id: string, ctx: RequestContext): Promise<RdStageHistoryEntry[]> {
    await this.requireItemWithAccess(id, ctx, "list rd stage history");
    return this.context.repo.listStageHistoryByItemId(id);
  }

  async listStageTasks(id: string, ctx: RequestContext): Promise<RdStageTaskEntity[]> {
    await this.requireItemWithAccess(id, ctx, "list rd stage tasks");
    return this.context.repo.listStageTasksByItemId(id);
  }

  async createStageTask(id: string, input: CreateRdStageTaskInput, ctx: RequestContext): Promise<RdStageTaskEntity> {
    const item = await this.requireItemWithAccess(id, ctx, "create rd stage task");
    await this.permission.requireBasicEditAccess(item, ctx, "create rd stage task");
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
    const entity = this.context.repo.transaction(() => {
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
        sortOrder: input.sortOrder ?? this.context.repo.getNextStageTaskSortOrder(item.id, stageKey),
        remark: input.remark?.trim() || null,
        createdAt: now,
        updatedAt: now,
        ownerProgresses: []
      };
      this.context.repo.createStageTask(createdEntity);
      this.context.repo.replaceStageTaskOwners(createdEntity, this.createStageTaskOwnerRows(createdEntity, now));
      this.refreshItemProgressByCurrentStageTasks(item, now);
      return createdEntity;
    });
    const latestItem = this.requireItem(item.id);
    this.context.repo.createLog(this.log.createLog(latestItem, "update", ctx, `新增阶段任务：${entity.title}`));
    await this.event.emitRdEvent("rd.updated", "stage_task_created", latestItem, ctx);
    return entity;
  }

  async updateStageTask(taskId: string, input: UpdateRdStageTaskInput, ctx: RequestContext): Promise<RdStageTaskEntity> {
    const task = this.requireStageTask(taskId);
    const item = await this.requireItemWithAccess(task.itemId, ctx, "update rd stage task");
    await this.permission.requireStageTaskEditAccess(item, task, ctx, "update rd stage task");
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
    const updated = this.context.repo.transaction(() => {
      const ok = this.context.repo.updateStageTask(task.id, {
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
        this.context.repo.replaceStageTaskOwners(
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
    const latestItem = this.requireItem(item.id);
    this.context.repo.createLog(this.log.createLog(item, "update", ctx, `更新阶段任务：${entity.title}`));
    await this.event.emitRdEvent("rd.updated", "stage_task_updated", latestItem, ctx);
    return entity;
  }

  async cancelStageTask(taskId: string, ctx: RequestContext): Promise<RdStageTaskEntity> {
    return this.updateStageTask(taskId, { status: "cancelled" }, ctx);
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
      const member = await this.context.projectAccess.requireProjectMember(projectId, id, "resolve rd stage task owner");
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
      const ok = this.context.repo.updateStageTaskOwnerProgress(taskId, owner.userId, {
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

  private refreshItemProgressByCurrentStageTasks(item: RdItemEntity, updatedAt: string): RdItemEntity {
    const current = this.requireItem(item.id);
    const progressRows = this.context.repo.listProgressByItemId(current.id);
    const progressByUser = new Map(progressRows.map((row) => [row.user_id, row.progress]));
    const mainProgress = this.calculateMainProgress(current, progressByUser);
    this.context.repo.updateItem(current.id, this.createItemProgressUpdatePayload(current, mainProgress, updatedAt));
    return this.requireItem(current.id);
  }

  private ensureCurrentStageBaselineTasksBeforeFirstExplicitTask(item: RdItemEntity, stageKey: string, createdAt: string): void {
    const stage = item.stageId ? this.context.repo.findStageById(item.stageId) : null;
    const currentStageKey = stage ? resolveRdStageKey(stage) : "";
    if (!stage || !currentStageKey || stageKey !== currentStageKey) {
      return;
    }
    const existingTasks = this.listCurrentStageActiveTasks(item);
    if (existingTasks.length > 0) {
      return;
    }
    const progressRows = this.context.repo.listProgressByItemId(item.id);
    const progressByUser = new Map(progressRows.map((row) => [row.user_id, row.progress]));
    const memberIds = this.member.collectEffectiveMemberIds(item.memberIds, item.assigneeId);
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
        sortOrder: this.context.repo.getNextStageTaskSortOrder(item.id, stageKey),
        remark: null,
        createdAt,
        updatedAt: createdAt
      };
      this.context.repo.createStageTask(task);
      this.context.repo.replaceStageTaskOwners(task, this.createStageTaskOwnerRows(task, createdAt));
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
}
