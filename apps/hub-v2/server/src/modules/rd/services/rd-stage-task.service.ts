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
  UpdateRdItemWithStageTasksInput,
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

type PreparedStageTaskCreate = {
  input: CreateRdStageTaskInput;
  owner: ResolvedStageTaskOwners;
  stageKey: string;
  title: string;
  description: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
};

type PreparedStageTaskUpdate = {
  task: RdStageTaskEntity;
  input: UpdateRdStageTaskInput;
  owner: ResolvedStageTaskOwners;
  ownerChanged: boolean;
  taskProgressChanged: boolean;
  nextStatus: RdStageTaskEntity["status"];
  nextProgress: number;
  startedAt: string | null;
  completedAt: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
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
      const description = input.description?.trim() || null;
      const createdEntity: RdStageTaskEntity = {
        id: genId("rdst"),
        projectId: item.projectId,
        itemId: item.id,
        stageKey,
        title,
        description,
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
    if (entity.description?.trim()) {
      await this.promoteStageTaskMarkdownUploads(latestItem.id, entity.description, ctx);
    }
    this.context.repo.createLog(this.log.createLog(latestItem, "update", ctx, this.createStageTaskLogContent(entity)));
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
    this.ensureCurrentStageKeepsActiveAssignments(item, task, nextStatus, ownerChanged ? owner.ownerIds : undefined);
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
    if (input.description !== undefined && entity.description?.trim()) {
      await this.promoteStageTaskMarkdownUploads(latestItem.id, entity.description, ctx);
    }
    this.context.repo.createLog(this.log.createLog(item, "update", ctx, `更新阶段任务：${entity.title}`));
    await this.event.emitRdEvent("rd.updated", "stage_task_updated", latestItem, ctx);
    return entity;
  }

  async cancelStageTask(taskId: string, ctx: RequestContext): Promise<RdStageTaskEntity> {
    return this.updateStageTask(taskId, { status: "cancelled" }, ctx);
  }

  async updateItemWithStageTasks(
    id: string,
    input: UpdateRdItemWithStageTasksInput,
    ctx: RequestContext
  ): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "edit rd item with stage tasks");
    await this.permission.requireBasicEditAccess(current, ctx, "edit rd item with stage tasks");
    this.requireItemVersion(current, input.version);
    const members = await this.member.resolveMembers(
      current.projectId,
      input.memberIds === undefined
        ? this.member.collectEffectiveMemberIds(current.memberIds, current.assigneeId)
        : input.memberIds,
      input.verifierId === undefined ? current.verifierId : input.verifierId
    );
    const memberIds = members.memberIds;
    const allowedOwnerIds = new Set(memberIds);
    const assigneeId = memberIds.length > 0 ? memberIds[0] : current.assigneeId;
    const assigneeName = memberIds.length > 0 ? members.memberNames[0] : current.assigneeName;
    const stageId =
      input.stageId === undefined ? current.stageId : await this.resolveStageId(current.projectId, input.stageId);
    const stage = stageId ? this.context.repo.findStageById(stageId) : null;
    const currentStageKey = stage ? resolveRdStageKey(stage) : "";
    const planStartAt = input.planStartAt === undefined ? current.planStartAt : input.planStartAt?.trim() || null;
    const planEndAt = input.planEndAt === undefined ? current.planEndAt : input.planEndAt?.trim() || null;
    this.validateItemPlanRange(planStartAt, planEndAt);

    const taskCreates = await this.prepareStageTaskCreates(
      current,
      currentStageKey,
      input.taskCreates ?? [],
      allowedOwnerIds
    );
    const taskUpdates = await this.prepareStageTaskUpdates(
      current,
      currentStageKey,
      input.taskUpdates ?? [],
      allowedOwnerIds
    );
    const taskCancelIds = [...new Set((input.taskCancelIds ?? []).map((item) => item.trim()).filter(Boolean))];
    const taskCancels = taskCancelIds.map((taskId) => this.requireEditableCurrentStageTask(current, currentStageKey, taskId));
    this.ensureBatchKeepsActiveAssignments(current, currentStageKey, taskCreates, taskUpdates, taskCancels);

    const now = nowIso();
    const updated = this.context.repo.transaction(() => {
      const success = this.context.repo.updateItem(id, {
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
        plan_start_at: planStartAt,
        plan_end_at: planEndAt,
        updated_at: now
      }, input.version);
      if (!success) {
        return false;
      }
      this.ensureMemberProgressRows(id, [...current.memberIds, current.assigneeId ?? "", ...memberIds], now);
      if (input.stageDescription !== undefined) {
        this.upsertCurrentStageNote(current.projectId, id, stageId, input.stageDescription, now);
      }
      for (const task of taskCreates) {
        this.createPreparedStageTask(current, task, now);
      }
      for (const task of taskUpdates) {
        this.updatePreparedStageTask(task, now);
      }
      for (const task of taskCancels) {
        this.cancelPreparedStageTask(task, now);
      }
      this.refreshItemProgressByCurrentStageTasks(this.requireItem(id), now);
      return true;
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.RD_ITEM_VERSION_CONFLICT, "rd item version conflict", 409);
    }
    const entity = this.requireItem(id);
    await this.context.uploadCommand.promoteMarkdownUploads(
      { content: entity.description, bucket: "rd", entityId: entity.id },
      ctx
    );
    if (input.stageDescription !== undefined) {
      await this.context.uploadCommand.promoteMarkdownUploads(
        { content: input.stageDescription, bucket: "rd", entityId: entity.id },
        ctx
      );
    }
    for (const task of [...taskCreates.map((item) => item.description), ...taskUpdates.map((item) => item.input.description ?? null)]) {
      if (task?.trim()) {
        await this.promoteStageTaskMarkdownUploads(entity.id, task, ctx);
      }
    }
    this.context.repo.createLog(this.log.createLog(entity, "update", ctx, await this.log.createUpdateLogContent(current, input)));
    for (const task of taskCreates) {
      this.context.repo.createLog(
        this.log.createLog(entity, "update", ctx, this.createStageTaskLogContent({
          ...this.createStageTaskEntityForPrepared(current, task, now),
          ownerProgresses: []
        }))
      );
    }
    for (const task of taskUpdates) {
      const latestTask = this.requireStageTask(task.task.id);
      this.context.repo.createLog(this.log.createLog(entity, "update", ctx, `更新阶段任务：${latestTask.title}`));
    }
    for (const task of taskCancels) {
      this.context.repo.createLog(this.log.createLog(entity, "update", ctx, `取消阶段任务：${task.title}`));
    }
    await this.event.emitRdEvent("rd.updated", "updated", entity, ctx);
    return this.member.withVerifierFallback(entity);
  }

  private async prepareStageTaskCreates(
    item: RdItemEntity,
    currentStageKey: string,
    inputs: CreateRdStageTaskInput[],
    allowedOwnerIds: Set<string>
  ): Promise<PreparedStageTaskCreate[]> {
    const result: PreparedStageTaskCreate[] = [];
    for (const input of inputs) {
      const stageKey = input.stageKey.trim();
      if (!currentStageKey || stageKey !== currentStageKey) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task must belong to current stage", 400);
      }
      const title = input.title.trim();
      const owner = await this.resolveStageTaskOwners(item.projectId, input.ownerIds, input.ownerId, input.ownerName);
      this.ensureStageTaskOwnersAllowed(owner.ownerIds, allowedOwnerIds);
      const plannedStartAt = input.plannedStartAt?.trim() || null;
      const plannedEndAt = input.plannedEndAt?.trim() || null;
      this.validateStageTaskPlanRange(plannedStartAt, plannedEndAt);
      result.push({
        input,
        owner,
        stageKey,
        title,
        description: input.description?.trim() || null,
        plannedStartAt,
        plannedEndAt
      });
    }
    return result;
  }

  private async prepareStageTaskUpdates(
    item: RdItemEntity,
    currentStageKey: string,
    updates: Array<{ taskId: string; input: UpdateRdStageTaskInput }>,
    allowedOwnerIds: Set<string>
  ): Promise<PreparedStageTaskUpdate[]> {
    const result: PreparedStageTaskUpdate[] = [];
    const seen = new Set<string>();
    for (const update of updates) {
      const taskId = update.taskId.trim();
      if (seen.has(taskId)) {
        continue;
      }
      seen.add(taskId);
      const task = this.requireEditableCurrentStageTask(item, currentStageKey, taskId);
      const input = update.input;
      const owner = await this.resolveStageTaskOwners(
        item.projectId,
        input.ownerIds,
        input.ownerId === undefined ? task.ownerId : input.ownerId,
        input.ownerName === undefined ? task.ownerName : input.ownerName
      );
      const ownerChanged = input.ownerIds !== undefined || input.ownerId !== undefined || input.ownerName !== undefined;
      if (ownerChanged) {
        this.ensureStageTaskOwnersAllowed(owner.ownerIds, allowedOwnerIds);
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
          ? (task.startedAt || (nextStatus === "in_progress" || nextStatus === "done" ? nowIso() : null))
          : input.startedAt?.trim() || null;
      const completedAt =
        input.completedAt === undefined
          ? (nextStatus === "done" ? task.completedAt || nowIso() : nextStatus === "cancelled" ? task.completedAt : null)
          : input.completedAt?.trim() || null;
      const plannedStartAt = input.plannedStartAt === undefined ? task.plannedStartAt : input.plannedStartAt?.trim() || null;
      const plannedEndAt = input.plannedEndAt === undefined ? task.plannedEndAt : input.plannedEndAt?.trim() || null;
      this.validateStageTaskPlanRange(plannedStartAt, plannedEndAt);
      result.push({
        task,
        input,
        owner,
        ownerChanged,
        taskProgressChanged,
        nextStatus,
        nextProgress,
        startedAt,
        completedAt,
        plannedStartAt,
        plannedEndAt
      });
    }
    return result;
  }

  private requireEditableCurrentStageTask(item: RdItemEntity, currentStageKey: string, taskId: string): RdStageTaskEntity {
    const task = this.requireStageTask(taskId);
    if (task.itemId !== item.id) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task does not match current rd item", 400);
    }
    if (!currentStageKey || task.stageKey !== currentStageKey) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task must belong to current stage", 400);
    }
    if (task.status === "cancelled") {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task is cancelled", 400);
    }
    return task;
  }

  private ensureStageTaskOwnersAllowed(ownerIds: string[], allowedOwnerIds: Set<string>): void {
    if (ownerIds.length === 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task owner is required", 400);
    }
    for (const ownerId of ownerIds) {
      if (!allowedOwnerIds.has(ownerId)) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task owner must be selected rd item member", 400);
      }
    }
  }

  private ensureBatchKeepsActiveAssignments(
    item: RdItemEntity,
    currentStageKey: string,
    creates: PreparedStageTaskCreate[],
    updates: PreparedStageTaskUpdate[],
    cancels: RdStageTaskEntity[]
  ): void {
    if (!currentStageKey) {
      return;
    }
    const cancelIds = new Set(cancels.map((task) => task.id));
    const updateById = new Map(updates.map((task) => [task.task.id, task]));
    const currentTasks = this.context.repo
      .listStageTasksByItemId(item.id)
      .filter((task) => task.stageKey === currentStageKey && task.status !== "cancelled");
    let activeAssignments = creates.reduce((count, task) => count + task.owner.ownerIds.length, 0);
    for (const task of currentTasks) {
      if (cancelIds.has(task.id)) {
        continue;
      }
      const update = updateById.get(task.id);
      if (update) {
        if (update.nextStatus === "cancelled") {
          continue;
        }
        activeAssignments += update.ownerChanged ? update.owner.ownerIds.length : this.countActiveStageTaskOwners(task);
        continue;
      }
      activeAssignments += this.countActiveStageTaskOwners(task);
    }
    if (activeAssignments <= 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "current stage must keep at least one active stage task owner", 400);
    }
  }

  private createPreparedStageTask(item: RdItemEntity, prepared: PreparedStageTaskCreate, now: string): RdStageTaskEntity {
    this.ensureCurrentStageBaselineTasksBeforeFirstExplicitTask(item, prepared.stageKey, now);
    const entity = this.createStageTaskEntityForPrepared(item, prepared, now);
    this.context.repo.createStageTask(entity);
    this.context.repo.replaceStageTaskOwners(entity, this.createStageTaskOwnerRows(entity, now));
    return entity;
  }

  private createStageTaskEntityForPrepared(item: RdItemEntity, prepared: PreparedStageTaskCreate, now: string): RdStageTaskEntity {
    const status = prepared.input.status ?? "pending";
    return {
      id: genId("rdst"),
      projectId: item.projectId,
      itemId: item.id,
      stageKey: prepared.stageKey,
      title: prepared.title,
      description: prepared.description,
      status,
      ownerId: prepared.owner.ownerId,
      ownerName: prepared.owner.ownerName,
      ownerIds: prepared.owner.ownerIds,
      ownerNames: prepared.owner.ownerNames,
      progress: this.resolveStageTaskProgress(status, prepared.input.progress),
      plannedStartAt: prepared.plannedStartAt,
      plannedEndAt: prepared.plannedEndAt,
      startedAt: prepared.input.startedAt?.trim() || (status === "in_progress" || status === "done" ? now : null),
      completedAt: prepared.input.completedAt?.trim() || (status === "done" ? now : null),
      sortOrder: prepared.input.sortOrder ?? this.context.repo.getNextStageTaskSortOrder(item.id, prepared.stageKey),
      remark: prepared.input.remark?.trim() || null,
      createdAt: now,
      updatedAt: now,
      ownerProgresses: []
    };
  }

  private updatePreparedStageTask(prepared: PreparedStageTaskUpdate, now: string): void {
    const { task, input, owner, ownerChanged, taskProgressChanged } = prepared;
    const ok = this.context.repo.updateStageTask(task.id, {
      stage_key: input.stageKey?.trim() || task.stageKey,
      title: input.title?.trim() || task.title,
      description: input.description === undefined ? task.description : input.description?.trim() || null,
      status: prepared.nextStatus,
      owner_id: owner.ownerId,
      owner_name: owner.ownerName,
      progress: prepared.nextProgress,
      planned_start_at: prepared.plannedStartAt,
      planned_end_at: prepared.plannedEndAt,
      started_at: prepared.startedAt,
      completed_at: prepared.completedAt,
      sort_order: input.sortOrder ?? task.sortOrder,
      remark: input.remark === undefined ? task.remark : input.remark?.trim() || null,
      updated_at: now
    });
    if (!ok) {
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to update rd stage task", 500);
    }
    if (ownerChanged) {
      const ownerTask = {
        ...task,
        ownerIds: owner.ownerIds,
        ownerNames: owner.ownerNames,
        status: taskProgressChanged ? prepared.nextStatus : "pending" as RdStageTaskEntity["status"],
        progress: taskProgressChanged ? prepared.nextProgress : 0,
        startedAt: taskProgressChanged ? prepared.startedAt : null,
        completedAt: taskProgressChanged ? prepared.completedAt : null
      };
      const existingOwnerProgressByUserId = new Map(task.ownerProgresses.map((row) => [row.userId, row]));
      this.context.repo.replaceStageTaskOwners(
        { id: task.id, projectId: task.projectId, itemId: task.itemId },
        this.createStageTaskOwnerRows(ownerTask, now, existingOwnerProgressByUserId)
      );
    }
    if (taskProgressChanged) {
      this.syncStageTaskOwnerProgressFromTaskState(task.id, prepared.nextStatus, prepared.nextProgress, prepared.startedAt, prepared.completedAt, now);
    }
    if (ownerChanged || taskProgressChanged) {
      this.updateStageTaskAggregateFromOwners(task.id, now);
    }
  }

  private cancelPreparedStageTask(task: RdStageTaskEntity, now: string): void {
    const ok = this.context.repo.updateStageTask(task.id, {
      status: "cancelled",
      completed_at: task.completedAt,
      updated_at: now
    });
    if (!ok) {
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to cancel rd stage task", 500);
    }
    this.syncStageTaskOwnerProgressFromTaskState(task.id, "cancelled", task.progress, task.startedAt, task.completedAt, now);
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

  private requireItemVersion(item: RdItemEntity, version: number): void {
    if (item.version !== version) {
      throw new AppError(ERROR_CODES.RD_ITEM_VERSION_CONFLICT, "rd item version conflict", 409);
    }
  }

  private validateItemPlanRange(planStartAt: string | null, planEndAt: string | null): void {
    if (!planStartAt || !planEndAt) {
      return;
    }
    const startAt = Date.parse(planStartAt);
    const endAt = Date.parse(planEndAt);
    if (Number.isFinite(startAt) && Number.isFinite(endAt) && startAt > endAt) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd planStartAt must be earlier than or equal to planEndAt", 400);
    }
  }

  private async resolveStageId(projectId: string, stageId: string | null | undefined): Promise<string | null> {
    const normalized = stageId?.trim() || null;
    if (!normalized) {
      return null;
    }
    const stage = this.context.repo.findStageById(normalized);
    if (!stage) {
      throw new AppError(ERROR_CODES.RD_STAGE_NOT_FOUND, `rd stage not found: ${normalized}`, 404);
    }
    if (stage.projectId !== projectId) {
      throw new AppError(ERROR_CODES.RD_STAGE_PROJECT_MISMATCH, "rd stage project mismatch", 400);
    }
    return stage.id;
  }

  private ensureMemberProgressRows(itemId: string, memberIds: string[], updatedAt: string): void {
    const existingIds = new Set(this.context.repo.listProgressByItemId(itemId).map((row) => row.user_id));
    for (const memberId of this.member.collectEffectiveMemberIds(memberIds)) {
      if (existingIds.has(memberId)) {
        continue;
      }
      this.context.repo.upsertProgress({
        id: genId("rdp"),
        item_id: itemId,
        user_id: memberId,
        progress: 0,
        note: null,
        updated_at: updatedAt
      });
      existingIds.add(memberId);
    }
  }

  private upsertCurrentStageNote(
    projectId: string,
    itemId: string,
    stageId: string | null,
    description: string | null | undefined,
    now: string
  ): void {
    if (!stageId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd current stage is required for stage description", 400);
    }
    const stage = this.context.repo.findStageById(stageId);
    if (!stage || stage.projectId !== projectId) {
      throw new AppError(ERROR_CODES.RD_STAGE_NOT_FOUND, `rd stage not found: ${stageId}`, 404);
    }
    const existing = this.context.repo.findStageNoteByItemAndStage(itemId, stage.id);
    this.context.repo.upsertStageNote({
      id: existing?.id ?? genId("rdsn"),
      projectId,
      itemId,
      stageId: stage.id,
      stageKey: resolveRdStageKey(stage),
      description: description?.trim() || null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    });
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
    return task.ownerIds.map((userId, index) => {
      const existing = existingByUserId.get(userId);
      const shouldReuseExistingState = !!existing && existing.status !== "cancelled";
      return {
        id: existingByUserId.get(userId)?.id ?? genId("rdsto"),
        taskId: task.id,
        projectId: task.projectId,
        itemId: task.itemId,
        userId,
        userName: task.ownerNames[index] ?? userId,
        status: shouldReuseExistingState ? existing.status : task.status,
        progress: shouldReuseExistingState ? existing.progress : task.progress,
        startedAt: shouldReuseExistingState ? existing.startedAt : task.startedAt,
        completedAt: shouldReuseExistingState ? existing.completedAt : task.completedAt,
        createdAt: existingByUserId.get(userId)?.createdAt ?? createdAt,
        updatedAt: createdAt
      };
    });
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

  private createStageTaskLogContent(task: RdStageTaskEntity): string {
    const ownerText = task.ownerNames.map((name) => name.trim()).filter(Boolean).join("、");
    return ownerText ? `新增阶段任务：${task.title}；执行人：${ownerText}` : `新增阶段任务：${task.title}`;
  }

  private ensureCurrentStageKeepsActiveAssignments(
    item: RdItemEntity,
    task: RdStageTaskEntity,
    nextStatus: RdStageTaskEntity["status"],
    nextOwnerIds: string[] | undefined
  ): void {
    const stage = item.stageId ? this.context.repo.findStageById(item.stageId) : null;
    const currentStageKey = stage ? resolveRdStageKey(stage) : "";
    if (!currentStageKey || task.stageKey !== currentStageKey) {
      return;
    }
    const currentTasks = this.context.repo
      .listStageTasksByItemId(item.id)
      .filter((itemTask) => itemTask.stageKey === currentStageKey && itemTask.status !== "cancelled");
    const nextActiveAssignmentCount = currentTasks.reduce((count, itemTask) => {
      if (itemTask.id !== task.id) {
        return count + this.countActiveStageTaskOwners(itemTask);
      }
      if (nextStatus === "cancelled") {
        return count;
      }
      return count + (nextOwnerIds === undefined ? this.countActiveStageTaskOwners(itemTask) : nextOwnerIds.length);
    }, 0);
    if (nextActiveAssignmentCount <= 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "current stage must keep at least one active stage task owner", 400);
    }
  }

  private countActiveStageTaskOwners(task: RdStageTaskEntity): number {
    const activeOwnerProgressCount = task.ownerProgresses.filter((owner) => owner.status !== "cancelled").length;
    if (activeOwnerProgressCount > 0) {
      return activeOwnerProgressCount;
    }
    const ownerIds = [...new Set((task.ownerIds?.length ? task.ownerIds : task.ownerId ? [task.ownerId] : []).map((id) => id.trim()).filter(Boolean))];
    return ownerIds.length;
  }

  private async promoteStageTaskMarkdownUploads(itemId: string, description: string | null, ctx: RequestContext): Promise<void> {
    await this.context.uploadCommand.promoteMarkdownUploads(
      {
        content: description,
        bucket: "rd",
        entityId: itemId
      },
      ctx
    );
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
      throw new AppError(ERROR_CODES.RD_STAGE_TASK_PLAN_ORDER_INVALID);
    }
  }
}
