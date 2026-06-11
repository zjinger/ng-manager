import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import { resolveRdStageKey } from "../rd-stage-task-templates";
import type {
  AdvanceRdStageInput,
  RdInitialStageTaskInput,
  RdItemEntity,
  RdStageEntity,
  RdStageTaskEntity,
  RdStageTaskTemplateEntity,
  RdStageTaskTemplateSelectionInput
} from "../rd.types";
import type { RdEventService } from "./rd-event.service";
import type { RdLogService } from "./rd-log.service";
import type { RdMemberService } from "./rd-member.service";
import type { RdPermissionService } from "./rd-permission.service";
import type { RdServiceContext } from "./rd-service-context";

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

export class RdStageFlowService {
  constructor(
    private readonly context: RdServiceContext,
    private readonly member: RdMemberService,
    private readonly permission: RdPermissionService,
    private readonly log: RdLogService,
    private readonly event: RdEventService
  ) {}

  async advanceStage(id: string, input: AdvanceRdStageInput, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "advance rd stage");
    await this.permission.requireAdvanceAccess(current, ctx, "advance rd stage");
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
            memberIds: this.member.collectEffectiveMemberIds(current.memberIds, current.assigneeId),
            memberNames: await this.member.resolveMemberNamesFallback(
              current.projectId,
              this.member.collectEffectiveMemberIds(current.memberIds, current.assigneeId)
            ),
            verifierId: current.verifierId,
            verifierName: current.verifierName
          }
        : await this.member.resolveMembers(current.projectId, input.memberIds, current.verifierId);
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

    const selectedTemplateTasks = input.stageTasks === undefined
      ? await this.resolveStageTaskTemplateSelections(
          current.projectId,
          targetStage.id,
          input.stageTaskTemplates ?? []
        )
      : [];
    const selectedInitialStageTasks = input.stageTasks === undefined
      ? await this.resolveBaselineStageTasks(
          current.projectId,
          targetStage,
          nextMembersRef.memberIds,
          new Set(selectedTemplateTasks.map((task) => task.ownerId).filter((ownerId): ownerId is string => !!ownerId))
        )
      : await this.resolveInitialStageTasks(
          current.projectId,
          targetStage.id,
          input.stageTasks,
          nextMembersRef.memberIds,
          nextPlanStartAt,
          nextPlanEndAt
        );

    const fromStageName = currentStage?.name || "未归类";
    const currentMemberNames = await this.member.resolveMemberNamesFallback(current.projectId, current.memberIds);
    const advanceAt = nowIso();
    const operatorId = ctx.userId?.trim() || ctx.accountId;
    const operatorName = ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId;
    const entity = this.context.repo.transaction(() => {
      const updated = this.context.repo.updateItem(id, {
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
      this.context.repo.deleteProgressByItemId(id);
      this.ensureMemberProgressRows(id, nextMembersRef.memberIds, advanceAt);
      if (selectedTemplateTasks.length > 0) {
        this.initializeStageTasksFromTemplates(current.projectId, id, selectedTemplateTasks, advanceAt);
      }
      if (selectedInitialStageTasks.length > 0) {
        this.initializeStageTasks(current.projectId, id, selectedInitialStageTasks, advanceAt);
      }
      this.upsertStageNote(current.projectId, id, targetStage, description || null, advanceAt);

      const advanced = this.requireItem(id);
      this.context.repo.createStageHistory({
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
      this.context.repo.createLog(
        this.log.createLog(
          advanced,
          "advance_stage",
          ctx,
          `推进阶段: ${fromStageName} -> ${targetStage.name}` +
            (nextMembersRef.memberNames.length > 0 ? `；成员: ${nextMembersRef.memberNames.join("、")}` : "；成员: 未指定") +
            ((nextPlanStartAt || nextPlanEndAt) ? `；计划: ${nextPlanStartAt || "-"} ~ ${nextPlanEndAt || "-"}` : ""),
          {
            stageId: targetStage.id,
            stageKey: resolveRdStageKey(targetStage),
            description: description || null,
            stageName: targetStage.name,
            memberNames: nextMembersRef.memberNames,
            planStartAt: nextPlanStartAt,
            planEndAt: nextPlanEndAt
          }
        )
      );
      return advanced;
    });
    if (description) {
      await this.context.uploadCommand.promoteMarkdownUploads(
        {
          content: description,
          bucket: "rd",
          entityId: entity.id
        },
        ctx
      );
    }
    await this.event.emitRdEvent("rd.updated", "advance_stage", entity, ctx);
    return this.member.withVerifierFallback(entity);
  }

  private requireStage(id: string): RdStageEntity {
    const stage = this.context.repo.findStageById(id);
    if (!stage) {
      throw new AppError(ERROR_CODES.RD_STAGE_NOT_FOUND, `rd stage not found: ${id}`, 404);
    }
    return stage;
  }

  private upsertStageNote(
    projectId: string,
    itemId: string,
    stage: RdStageEntity,
    description: string | null,
    now: string
  ): void {
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
    return this.context.repo
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
        updated_at: updatedAt,
      });
      existingIds.add(memberId);
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
    const templates = this.context.repo.listStageTaskTemplatesByIds(templateIds);
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
    const targetStage = this.context.repo.findStageById(targetStageId);
    if (!targetStage || targetStage.projectId !== projectId || !targetStage.enabled) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd stage task target stage is unavailable", 400);
    }
    const allowedOwnerIds = new Set(memberIds);
    const templateIds = [...new Set(normalizedTasks.map((task) => task.templateId).filter((id): id is string => !!id))];
    const templates = templateIds.length > 0 ? this.context.repo.listStageTaskTemplatesByIds(templateIds) : [];
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

  private async resolveBaselineStageTasks(
    projectId: string,
    targetStage: RdStageEntity,
    memberIds: string[],
    excludedOwnerIds: Set<string>
  ): Promise<ResolvedInitialStageTask[]> {
    const result: ResolvedInitialStageTask[] = [];
    for (const memberId of memberIds) {
      if (excludedOwnerIds.has(memberId)) {
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
      const nextSortOrder =
        sortOrderByStageKey.get(template.stageKey) ?? this.context.repo.getNextStageTaskSortOrder(itemId, template.stageKey);
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
      this.context.repo.createStageTask(task);
      this.context.repo.replaceStageTaskOwners(task, this.createStageTaskOwnerRows(task, createdAt));
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
      const nextSortOrder =
        sortOrderByStageKey.get(taskInput.stageKey) ?? this.context.repo.getNextStageTaskSortOrder(itemId, taskInput.stageKey);
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
      this.context.repo.createStageTask(task);
      this.context.repo.replaceStageTaskOwners(task, this.createStageTaskOwnerRows(task, createdAt));
      sortOrderByStageKey = new Map(sortOrderByStageKey).set(taskInput.stageKey, nextSortOrder + 10);
    }
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
    const progressByUser = new Map(this.context.repo.listProgressByItemId(itemId).map((row) => [row.user_id, row.progress]));
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
      throw new AppError(ERROR_CODES.RD_STAGE_TASK_PLAN_RANGE_REQUIRED);
    }
    const itemStart = Date.parse(itemPlanStartAt);
    const itemEnd = Date.parse(itemPlanEndAt);
    const taskStart = plannedStartAt ? Date.parse(plannedStartAt) : null;
    const taskEnd = plannedEndAt ? Date.parse(plannedEndAt) : null;
    if (!Number.isFinite(itemStart) || !Number.isFinite(itemEnd)) {
      return;
    }
    if (Number.isFinite(taskStart) && (taskStart! < itemStart || taskStart! > itemEnd)) {
      throw new AppError(ERROR_CODES.RD_STAGE_TASK_PLAN_START_OUT_OF_RANGE);
    }
    if (Number.isFinite(taskEnd) && (taskEnd! < itemStart || taskEnd! > itemEnd)) {
      throw new AppError(ERROR_CODES.RD_STAGE_TASK_PLAN_END_OUT_OF_RANGE);
    }
  }
}
