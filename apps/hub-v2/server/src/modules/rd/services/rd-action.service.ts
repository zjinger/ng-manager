import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { nowIso } from "../../../shared/utils/time";
import { requireRdAcceptAccess } from "../rd.policy";
import { resolveRdStageKey } from "../rd-stage-task-templates";
import { transitionRdItem } from "../rd-state-machine";
import type {
  BlockRdItemInput,
  CloseRdItemInput,
  CompleteRdItemInput,
  RdAction,
  RdItemEntity,
  RdStageTaskEntity
} from "../rd.types";
import type { RdEventService } from "./rd-event.service";
import type { RdLogService } from "./rd-log.service";
import type { RdMemberService } from "./rd-member.service";
import type { RdPermissionService } from "./rd-permission.service";
import type { RdServiceContext } from "./rd-service-context";

export class RdActionService {
  constructor(
    private readonly context: RdServiceContext,
    private readonly member: RdMemberService,
    private readonly permission: RdPermissionService,
    private readonly log: RdLogService,
    private readonly event: RdEventService
  ) {}

  async start(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "start rd item");
    this.permission.requireAssignee(current, ctx, "start rd item");
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
    await this.permission.requireBlockAccess(current, ctx, "block rd item");
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
    await this.permission.requireBlockAccess(current, ctx, "resume rd item");
    return this.applyAction(id, "resume", ctx, current, { blocker_reason: null }, "标记研发项已恢复");
  }

  async reopen(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "reopen rd item");
    await this.permission.requireCloseAccess(current, ctx, "reopen rd item");
    const reopenStatus = this.getReopenStatusByProgress(current.progress);
    const updated = this.context.repo.updateItem(id, {
      status: reopenStatus,
      blocker_reason: null,
      actual_end_at: null,
      updated_at: nowIso()
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.RD_ACTION_FAILED, "failed to reopen rd item", 500);
    }
    const entity = this.requireItem(id);
    this.context.repo.createLog(this.log.createLog(entity, "reopen", ctx, "恢复研发项"));
    await this.event.emitRdEvent("rd.updated", "reopen", entity, ctx);
    return entity;
  }

  async complete(
    id: string,
    ctx: RequestContext,
    input: CompleteRdItemInput = {},
    expectedVersion?: number
  ): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "complete rd item");
    this.permission.requireCompleteAccess(current, ctx, "complete rd item");
    const now = nowIso();
    const byVerifier = this.member.isVerifier(current, ctx);
    const progressOverview = await this.createMemberProgressOverview(current);
    const taskOverview = this.createCurrentStageTaskProgressOverview(current);
    const reason = input.reason?.trim() || "";
    if (taskOverview.hasIncomplete) {
      throw new AppError(ERROR_CODES.RD_STAGE_TASKS_INCOMPLETE);
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
    const stageName = current.stageId ? this.context.repo.findStageById(current.stageId)?.name || "当前" : "当前";
    return this.applyAction(id, "accept", ctx, current, {}, `标记${stageName}阶段已经完成`);
  }

  async close(id: string, input: CloseRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "close rd item");
    await this.permission.requireCloseAccess(current, ctx, "close rd item");
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

  private requireItem(id: string): RdItemEntity {
    const item = this.context.repo.findItemById(id);
    if (!item) {
      throw new AppError(ERROR_CODES.RD_ITEM_NOT_FOUND, `rd item not found: ${id}`, 404);
    }
    return this.member.withVerifierFallback(item);
  }

  private async requireItemWithAccess(id: string, ctx: RequestContext, action: string): Promise<RdItemEntity> {
    const item = this.requireItem(id);
    await this.context.projectAccess.requireProjectAccess(item.projectId, ctx, action);
    return item;
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
    const updated = this.context.repo.updateItem(id, {
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
    this.context.repo.createLog(this.log.createLog(entity, action, ctx, content));
    await this.event.emitRdEvent("rd.updated", action, entity, ctx);
    return entity;
  }

  private async createMemberProgressOverview(item: RdItemEntity): Promise<{ summary: string; hasIncomplete: boolean }> {
    const memberIds = this.member.collectEffectiveMemberIds(item.memberIds, item.assigneeId);
    if (memberIds.length === 0) {
      return { summary: "", hasIncomplete: false };
    }
    const names = await this.member.resolveMemberNamesFallback(item.projectId, memberIds);
    const taskProgress = this.calculateCurrentStageTaskAssignmentProgress(item);
    const storedProgressByUser = new Map(this.context.repo.listProgressByItemId(item.id).map((row) => [row.user_id, row.progress]));
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

      const ownerIds = [
        ...new Set((task.ownerIds?.length ? task.ownerIds : task.ownerId ? [task.ownerId] : []).map((id) => id.trim()).filter(Boolean))
      ];
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
}
