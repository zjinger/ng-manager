import Database from "better-sqlite3";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import { ProjectMemberService } from "../project/project-member.service";
import { ProjectRepo } from "../project/project.repo";
import { RdPermissionService } from "./rd.permission";
import { RdRepo } from "./rd.repo";
import type {
  AddRdCommentInput,
  ChangeRdItemStatusInput,
  CreateRdItemInput,
  CreateRdStageInput,
  CurrentUserRdListQuery,
  OperatorInput,
  RdItemDetailResult,
  RdItemEntity,
  RdItemListResult,
  RdItemStatus,
  RdListQuery,
  RdLogActionType,
  RdOverview,
  RdStageEntity,
  UpdateRdItemInput,
  UpdateRdItemProgressInput,
  UpdateRdStageInput
} from "./rd.types";

export class RdService {
  constructor(
    private readonly repo: RdRepo,
    private readonly projectRepo: ProjectRepo,
    private readonly projectMemberService: ProjectMemberService,
    private readonly permission: RdPermissionService
  ) {}

  listStages(projectId: string, operator: OperatorInput): RdStageEntity[] {
    this.requireProject(projectId);
    const operatorId = this.permission.requireOperatorId(operator.operatorId, "list rd stages");
    this.permission.assertCanView(projectId, operatorId);
    return this.repo.listStages(projectId);
  }

  createStage(projectId: string, input: CreateRdStageInput): RdStageEntity {
    this.requireProject(projectId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "create rd stage");
    this.permission.assertCanManageStage(projectId, operatorId);

    const now = nowIso();
    const entity: RdStageEntity = {
      id: genId("rds"),
      projectId,
      name: input.name.trim(),
      sort: input.sort ?? 0,
      enabled: input.enabled !== false,
      createdAt: now,
      updatedAt: now
    };

    try {
      this.repo.createStage(entity);
    } catch (error) {
      if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new AppError("RD_STAGE_EXISTS", `rd stage already exists: ${entity.name}`, 409);
      }
      throw error;
    }
    return this.requireStage(projectId, entity.id);
  }

  updateStage(projectId: string, stageId: string, input: UpdateRdStageInput): RdStageEntity {
    this.requireProject(projectId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "update rd stage");
    this.permission.assertCanManageStage(projectId, operatorId);
    this.requireStage(projectId, stageId);

    try {
      const changed = this.repo.updateStage(projectId, stageId, {
        name: input.name?.trim(),
        sort: input.sort,
        enabled: input.enabled,
        updatedAt: nowIso()
      });
      if (!changed) {
        throw new AppError("RD_STAGE_UPDATE_FAILED", "failed to update rd stage", 500);
      }
    } catch (error) {
      if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new AppError("RD_STAGE_EXISTS", `rd stage already exists: ${input.name}`, 409);
      }
      throw error;
    }

    return this.requireStage(projectId, stageId);
  }

  removeStage(projectId: string, stageId: string, operator: OperatorInput): void {
    this.requireProject(projectId);
    const operatorId = this.permission.requireOperatorId(operator.operatorId, "delete rd stage");
    this.permission.assertCanManageStage(projectId, operatorId);
    this.requireStage(projectId, stageId);

    if (this.repo.countItemsByStage(projectId, stageId) > 0) {
      throw new AppError("RD_STAGE_IN_USE", "rd stage is still used by rd items", 409);
    }

    const changed = this.repo.deleteStage(projectId, stageId);
    if (!changed) {
      throw new AppError("RD_STAGE_DELETE_FAILED", "failed to delete rd stage", 500);
    }
  }

  getOverview(projectId: string, operator: OperatorInput): RdOverview {
    this.requireProject(projectId);
    const operatorId = this.permission.requireOperatorId(operator.operatorId, "get rd overview");
    this.permission.assertCanView(projectId, operatorId);
    return this.repo.getOverview(projectId);
  }

  list(projectId: string, query: Omit<RdListQuery, "projectId">, operator: OperatorInput): RdItemListResult {
    this.requireProject(projectId);
    const operatorId = this.permission.requireOperatorId(operator.operatorId, "list rd items");
    this.permission.assertCanView(projectId, operatorId);
    return this.repo.listItems({ ...query, projectId });
  }

  listCurrentUserItems(query: CurrentUserRdListQuery, operator: OperatorInput): RdItemListResult {
    const operatorId = this.permission.requireOperatorId(operator.operatorId, "list current user rd items");
    const scopedProjectIds = query.projectId
      ? this.projectMemberService.findMemberByProjectAndUserId(query.projectId, operatorId)
        ? [query.projectId]
        : []
      : this.projectMemberService.listProjectIdsByUserId(operatorId);

    return this.repo.listByProjectIds(scopedProjectIds, {
      stageId: query.stageId,
      status: query.status,
      priority: query.priority,
      type: query.type,
      assigneeId: query.assigneeId,
      overdue: query.overdue,
      keyword: query.keyword,
      page: query.page,
      pageSize: query.pageSize
    });
  }

  getDetail(projectId: string, itemId: string, operator: OperatorInput): RdItemDetailResult {
    this.requireProject(projectId);
    const operatorId = this.permission.requireOperatorId(operator.operatorId, "get rd detail");
    this.permission.assertCanView(projectId, operatorId);
    const detail = this.repo.getDetail(projectId, itemId);
    if (!detail) {
      throw new AppError("RD_ITEM_NOT_FOUND", `rd item not found: ${itemId}`, 404);
    }
    return detail;
  }

  create(input: CreateRdItemInput): RdItemEntity {
    this.requireProject(input.projectId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "create rd item");
    this.permission.assertCanCreate(input.projectId, operatorId);

    const stage = this.requireStage(input.projectId, input.stageId);
    const operatorName = this.resolveOperatorName(input.projectId, operatorId, input.operatorName);
    const assignee = this.resolveMemberReference(input.projectId, input.assigneeId, "assign rd item");
    const reviewer = this.resolveMemberReference(input.projectId, input.reviewerId, "review rd item");
    const nextStatus = input.status ?? "todo";
    const nextProgress = this.normalizeProgress(input.progress, nextStatus);
    const blockerReason = this.normalizeBlockerReason(nextStatus, input.blockerReason);
    const now = nowIso();

    const entity: RdItemEntity = {
      id: genId("rdi"),
      projectId: input.projectId,
      rdNo: this.repo.getNextRdNo(input.projectId),
      title: input.title.trim(),
      description: input.description?.trim() || "",
      stageId: stage.id,
      stageName: stage.name,
      type: input.type ?? "feature_dev",
      status: nextStatus,
      priority: input.priority ?? "medium",
      assigneeId: assignee?.userId ?? null,
      assigneeName: assignee?.displayName ?? null,
      creatorId: operatorId,
      creatorName: operatorName,
      reviewerId: reviewer?.userId ?? null,
      reviewerName: reviewer?.displayName ?? null,
      progress: nextProgress,
      planStartAt: this.normalizeDateValue(input.planStartAt),
      planEndAt: this.normalizeDateValue(input.planEndAt),
      actualStartAt: this.deriveActualStartAt(nextStatus, nextProgress, null),
      actualEndAt: this.deriveActualEndAt(nextStatus, nextProgress, null),
      blockerReason,
      createdAt: now,
      updatedAt: now
    };

    try {
      this.repo.runInTransaction(() => {
        this.repo.createItem(entity);
        this.recordLog(entity.projectId, entity.id, "create", `创建研发项 ${entity.rdNo} ${entity.title}`, operatorId, operatorName);
      });
    } catch (error) {
      if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new AppError("RD_ITEM_CREATE_FAILED", "failed to create rd item because rd_no already exists", 409);
      }
      throw error;
    }

    return this.requireItem(input.projectId, entity.id);
  }

  update(projectId: string, itemId: string, input: UpdateRdItemInput): RdItemEntity {
    const item = this.requireItem(projectId, itemId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "edit rd item");
    this.permission.assertCanEdit(item, operatorId);

    const stage = input.stageId ? this.requireStage(projectId, input.stageId) : null;
    const assignee = input.assigneeId !== undefined
      ? this.resolveMemberReference(projectId, input.assigneeId, "assign rd item")
      : undefined;
    const reviewer = input.reviewerId !== undefined
      ? this.resolveMemberReference(projectId, input.reviewerId, "review rd item")
      : undefined;
    const progress = input.progress !== undefined ? this.normalizeProgress(input.progress, item.status) : undefined;
    const blockerReason = input.blockerReason !== undefined ? this.normalizeOptionalText(input.blockerReason) : undefined;
    const operatorName = this.resolveOperatorName(projectId, operatorId, input.operatorName);

    const changed = this.repo.updateItem(projectId, itemId, {
      title: input.title?.trim(),
      description: input.description?.trim(),
      stageId: stage?.id,
      type: input.type,
      priority: input.priority,
      assigneeId: assignee === undefined ? undefined : (assignee?.userId ?? null),
      assigneeName: assignee === undefined ? undefined : (assignee?.displayName ?? null),
      reviewerId: reviewer === undefined ? undefined : (reviewer?.userId ?? null),
      reviewerName: reviewer === undefined ? undefined : (reviewer?.displayName ?? null),
      progress,
      planStartAt: input.planStartAt === undefined ? undefined : this.normalizeDateValue(input.planStartAt),
      planEndAt: input.planEndAt === undefined ? undefined : this.normalizeDateValue(input.planEndAt),
      blockerReason,
      updatedAt: nowIso()
    });

    if (!changed) {
      throw new AppError("RD_ITEM_UPDATE_FAILED", "failed to update rd item", 500);
    }

    this.recordLog(projectId, itemId, "edit", `更新研发项信息：${item.rdNo}`, operatorId, operatorName);
    return this.requireItem(projectId, itemId);
  }

  changeStatus(projectId: string, itemId: string, input: ChangeRdItemStatusInput): RdItemEntity {
    const item = this.requireItem(projectId, itemId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "change rd item status");
    this.permission.assertCanEdit(item, operatorId);
    const operatorName = this.resolveOperatorName(projectId, operatorId, input.operatorName);
    const nextStatus = input.status;
    const blockerReason = this.normalizeBlockerReason(nextStatus, input.blockerReason);
    const nextProgress = this.normalizeProgress(item.progress, nextStatus);
    const now = nowIso();

    const changed = this.repo.updateItem(projectId, itemId, {
      status: nextStatus,
      progress: nextProgress,
      blockerReason,
      actualStartAt: this.deriveActualStartAt(nextStatus, nextProgress, item.actualStartAt),
      actualEndAt: this.deriveActualEndAt(nextStatus, nextProgress, item.actualEndAt),
      updatedAt: now
    });

    if (!changed) {
      throw new AppError("RD_ITEM_STATUS_UPDATE_FAILED", "failed to update rd item status", 500);
    }

    const actionType: RdLogActionType =
      nextStatus === "blocked" ? "block" : item.status === "blocked" ? "unblock" : "status_change";
    this.recordLog(projectId, itemId, actionType, `状态变更：${item.status} -> ${nextStatus}`, operatorId, operatorName);
    return this.requireItem(projectId, itemId);
  }

  updateProgress(projectId: string, itemId: string, input: UpdateRdItemProgressInput): RdItemEntity {
    const item = this.requireItem(projectId, itemId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "update rd item progress");
    this.permission.assertCanEdit(item, operatorId);
    const operatorName = this.resolveOperatorName(projectId, operatorId, input.operatorName);
    const nextProgress = this.normalizeProgress(input.progress, item.status);
    const nextStatus = this.deriveStatusByProgress(item.status, nextProgress);

    const changed = this.repo.updateItem(projectId, itemId, {
      progress: nextProgress,
      status: nextStatus,
      actualStartAt: this.deriveActualStartAt(nextStatus, nextProgress, item.actualStartAt),
      actualEndAt: this.deriveActualEndAt(nextStatus, nextProgress, item.actualEndAt),
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError("RD_ITEM_PROGRESS_UPDATE_FAILED", "failed to update rd item progress", 500);
    }

    this.recordLog(projectId, itemId, "progress_update", `进度更新：${item.progress}% -> ${nextProgress}%`, operatorId, operatorName);
    return this.requireItem(projectId, itemId);
  }

  addComment(projectId: string, itemId: string, input: AddRdCommentInput): RdItemDetailResult {
    const item = this.requireItem(projectId, itemId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "comment rd item");
    this.permission.assertCanView(projectId, operatorId);
    const operatorName = this.resolveOperatorName(projectId, operatorId, input.operatorName);
    this.recordLog(projectId, item.id, "comment", input.content.trim(), operatorId, operatorName);
    return this.getDetail(projectId, itemId, input);
  }

  remove(projectId: string, itemId: string, operator: OperatorInput): void {
    const item = this.requireItem(projectId, itemId);
    const operatorId = this.permission.requireOperatorId(operator.operatorId, "delete rd item");
    this.permission.assertCanDelete(item, operatorId);

    const changed = this.repo.deleteItem(projectId, itemId);
    if (!changed) {
      throw new AppError("RD_ITEM_DELETE_FAILED", "failed to delete rd item", 500);
    }
  }

  private requireProject(projectId: string): void {
    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectId}`, 404);
    }
  }

  private requireStage(projectId: string, stageId: string): RdStageEntity {
    const stage = this.repo.findStageById(projectId, stageId);
    if (!stage) {
      throw new AppError("RD_STAGE_NOT_FOUND", `rd stage not found: ${stageId}`, 404);
    }
    return stage;
  }

  private requireItem(projectId: string, itemId: string): RdItemEntity {
    const item = this.repo.findItemById(projectId, itemId);
    if (!item) {
      throw new AppError("RD_ITEM_NOT_FOUND", `rd item not found: ${itemId}`, 404);
    }
    return item;
  }

  private resolveMemberReference(projectId: string, userId: string | null | undefined, action: string) {
    const value = userId?.trim();
    if (!value) {
      return value === undefined ? undefined : null;
    }
    return this.permission.requireProjectMember(projectId, value, action);
  }

  private resolveOperatorName(projectId: string, operatorId: string, fallbackName?: string | null): string {
    const fallback = fallbackName?.trim();
    if (fallback) {
      return fallback;
    }
    const member = this.projectMemberService.findMemberByProjectAndUserId(projectId, operatorId);
    if (member?.displayName?.trim()) {
      return member.displayName.trim();
    }
    return operatorId;
  }

  private normalizeProgress(progress: number | null | undefined, status: RdItemStatus): number {
    if (status === "done") {
      return 100;
    }
    if (progress === null || progress === undefined) {
      return status === "doing" ? 10 : 0;
    }
    if (progress < 0 || progress > 100) {
      throw new AppError("RD_PROGRESS_INVALID", "progress must be between 0 and 100", 400);
    }
    return Math.round(progress);
  }

  private normalizeBlockerReason(status: RdItemStatus, blockerReason: string | null | undefined): string | null {
    const value = this.normalizeOptionalText(blockerReason);
    if (status === "blocked" && !value) {
      throw new AppError("RD_BLOCKER_REQUIRED", "blockerReason is required when status is blocked", 400);
    }
    return status === "blocked" ? value : null;
  }

  private normalizeDateValue(value: string | null | undefined): string | null {
    const text = value?.trim();
    return text ? text : null;
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    const text = value?.trim();
    return text ? text : null;
  }

  private deriveActualStartAt(status: RdItemStatus, progress: number, current: string | null | undefined): string | null {
    if (current) {
      return current;
    }
    if (status === "doing" || status === "blocked" || status === "done" || progress > 0) {
      return nowIso();
    }
    return null;
  }

  private deriveActualEndAt(status: RdItemStatus, progress: number, current: string | null | undefined): string | null {
    if (status === "done" || progress >= 100) {
      return current || nowIso();
    }
    return null;
  }

  private deriveStatusByProgress(currentStatus: RdItemStatus, progress: number): RdItemStatus {
    if (currentStatus === "blocked" || currentStatus === "canceled") {
      return currentStatus;
    }
    if (progress >= 100) {
      return "done";
    }
    if (progress > 0 && currentStatus === "todo") {
      return "doing";
    }
    return currentStatus;
  }

  private recordLog(projectId: string, itemId: string, actionType: RdLogActionType, content: string, operatorId: string, operatorName: string): void {
    this.repo.createLog({
      id: genId("rdl"),
      projectId,
      itemId,
      actionType,
      content,
      operatorId,
      operatorName,
      createdAt: nowIso()
    });
  }
}
