import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import { resolveRdStageKey } from "../rd-stage-task-templates";
import type {
  CreateRdItemInput,
  ListRdItemsQuery,
  RdInitialStageTaskInput,
  RdItemEntity,
  RdItemListResult,
  RdStageEntity,
  RdStageTaskEntity,
  RdStageTaskTemplateEntity,
  RdStageTaskTemplateSelectionInput,
  UpdateRdItemInput
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

export class RdItemService {
  constructor(
    private readonly context: RdServiceContext,
    private readonly member: RdMemberService,
    private readonly permission: RdPermissionService,
    private readonly log: RdLogService,
    private readonly event: RdEventService
  ) {}

  async createItem(input: CreateRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    const projectId = input.projectId.trim();
    const itemType = input.type ?? "feature_dev";
    const creatorId = ctx.userId?.trim() || ctx.accountId;
    const creatorName = ctx.nickname?.trim() || ctx.userId?.trim() || ctx.accountId;
    const requestedVerifierId = input.verifierId?.trim() || null;
    const defaultVerifierId = requestedVerifierId || creatorId;
    await this.context.projectAccess.requireProjectAccess(projectId, ctx, "create rd item");
    const members = await this.member.resolveMembers(projectId, input.memberIds ?? [], defaultVerifierId);
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
      rdNo: this.context.repo.getNextRdNo(projectId, itemType),
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
    this.context.repo.transaction(() => {
      this.context.repo.createItem(entity);
      this.ensureMemberProgressRows(entity.id, memberIds, now);
      if (selectedTemplateTasks.length > 0) {
        this.initializeStageTasksFromTemplates(projectId, entity.id, selectedTemplateTasks, now);
      }
      if (selectedInitialStageTasks.length > 0) {
        this.initializeStageTasks(projectId, entity.id, selectedInitialStageTasks, now);
      }
    });
    await this.promoteTempMarkdownUploads(entity.id, entity.description, ctx);
    this.context.repo.createLog(this.log.createLog(entity, "create", ctx, `创建研发项 ${entity.rdNo}`));
    await this.event.emitRdEvent("rd.created", "created", entity, ctx);
    return this.member.withVerifierFallback(entity);
  }

  async updateItem(id: string, input: UpdateRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    const current = await this.requireItemWithAccess(id, ctx, "update rd item");
    await this.permission.requireBasicEditAccess(current, ctx, "update rd item");
    this.requireItemVersion(current, input.version);
    const members = await this.member.resolveMembers(
      current.projectId,
      input.memberIds === undefined
        ? this.member.collectEffectiveMemberIds(current.memberIds, current.assigneeId)
        : input.memberIds,
      input.verifierId === undefined ? current.verifierId : input.verifierId
    );
    const memberIds = members.memberIds;
    const assigneeId = memberIds.length > 0 ? memberIds[0] : current.assigneeId;
    const assigneeName = memberIds.length > 0 ? members.memberNames[0] : current.assigneeName;
    const stageId =
      input.stageId === undefined ? current.stageId : await this.resolveStageId(current.projectId, input.stageId);
    const planStartAt = input.planStartAt === undefined ? current.planStartAt : input.planStartAt?.trim() || null;
    const planEndAt = input.planEndAt === undefined ? current.planEndAt : input.planEndAt?.trim() || null;
    this.validatePlanRange(planStartAt, planEndAt);
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
      if (success) {
        this.ensureMemberProgressRows(id, [...current.memberIds, current.assigneeId ?? "", ...memberIds], now);
        if (input.stageDescription !== undefined) {
          this.upsertCurrentStageNote(current.projectId, id, stageId, input.stageDescription, now);
        }
      }
      return success;
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.RD_ITEM_VERSION_CONFLICT, "rd item version conflict", 409);
    }
    const entity = this.requireItem(id);
    await this.promoteTempMarkdownUploads(entity.id, entity.description, ctx);
    if (input.stageDescription !== undefined) {
      await this.promoteTempMarkdownUploads(entity.id, input.stageDescription, ctx);
    }
    this.context.repo.createLog(this.log.createLog(entity, "update", ctx, await this.log.createUpdateLogContent(current, input)));
    await this.event.emitRdEvent("rd.updated", "updated", entity, ctx);
    return this.member.withVerifierFallback(entity);
  }

  async listStageNotes(id: string, ctx: RequestContext) {
    const item = await this.requireItemWithAccess(id, ctx, "list rd stage notes");
    return this.context.repo.listStageNotesByItemId(item.id);
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
      await this.context.projectAccess.requireProjectAccess(query.projectId.trim(), ctx, "list rd items");
      const result = this.context.repo.listItems(normalizedQuery, [query.projectId.trim()]);
      return {
        ...result,
        items: result.items.map((item) => this.member.withVerifierFallback(item))
      };
    }

    const projectIds = await this.context.projectAccess.listAccessibleProjectIds(ctx);
    const result = this.context.repo.listItems(normalizedQuery, projectIds);
    return {
      ...result,
      items: result.items.map((item) => this.member.withVerifierFallback(item))
    };
  }

  async getItemById(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    return this.member.withVerifierFallback(await this.requireItemWithAccess(id, ctx, "get rd item"));
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

  private requireItemVersion(item: RdItemEntity, version: number): void {
    if (item.version !== version) {
      throw new AppError(ERROR_CODES.RD_ITEM_VERSION_CONFLICT, "rd item version conflict", 409);
    }
  }

  private validatePlanRange(planStartAt: string | null, planEndAt: string | null): void {
    if (!planStartAt || !planEndAt) {
      return;
    }
    const startAt = Date.parse(planStartAt);
    const endAt = Date.parse(planEndAt);
    if (Number.isFinite(startAt) && Number.isFinite(endAt) && startAt > endAt) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd planStartAt must be earlier than or equal to planEndAt", 400);
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

  private async promoteTempMarkdownUploads(itemId: string, description: string | null, ctx: RequestContext): Promise<void> {
    await this.context.uploadCommand.promoteMarkdownUploads(
      {
        content: description,
        bucket: "rd",
        entityId: itemId
      },
      ctx
    );
  }
}
