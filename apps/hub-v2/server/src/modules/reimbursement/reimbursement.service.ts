import type { RequestContext } from "../../shared/context/request-context";
import type { EventBus } from "../../shared/event/event-bus";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ReimbursementCommandContract, ReimbursementQueryContract } from "./reimbursement.contract";
import { normalizeTravelItemMeta } from "./reimbursement.types";
import type {
  AttachReimbursementUploadInput,
  CreateReimbursementClaimInput,
  ListReimbursementClaimsQuery,
  ReimbursementActionInput,
  ReimbursementApprovalPreview,
  ReimbursementApprovalPreviewNodeStatus,
  ReimbursementApprovalTaskEntity,
  ReimbursementClaimDetail,
  ReimbursementClaimEntity,
  ReimbursementExportFile,
  ReimbursementClaimListResult,
  ReimbursementDashboard,
  ReimbursementStats,
  ReimbursementStatsQuery,
  ReimbursementTransferInput,
  UpdateReimbursementClaimInput,
} from "./reimbursement.types";
import { ReimbursementRepo } from "./reimbursement.repo";
import type { ApprovalTemplateStage, ApprovalTemplateWithStages, UploadDisplayInfo, UserApprovalProfile } from "./reimbursement.repo";
import type { ReimbursementItemEntity, ReimbursementItemInput, ReimbursementLogAction } from "./reimbursement.types";
import { renderReimbursementWord } from "./reimbursement-word-export";

const DEFAULT_TEMPLATE_CODE = "expense_default";

export class ReimbursementService implements ReimbursementCommandContract, ReimbursementQueryContract {
  constructor(
    private readonly repo: ReimbursementRepo,
    private readonly eventBus?: EventBus
  ) {}

  async dashboard(ctx: RequestContext): Promise<ReimbursementDashboard> {
    const userId = this.requireUserId(ctx);
    return this.repo.dashboard(userId);
  }

  async list(query: ListReimbursementClaimsQuery, ctx: RequestContext): Promise<ReimbursementClaimListResult> {
    const userId = this.requireUserId(ctx);
    return this.repo.listClaims(query, userId, this.canSeeAll(ctx, userId));
  }

  async getById(id: string, ctx: RequestContext): Promise<ReimbursementClaimDetail> {
    const claim = this.requireClaim(id);
    this.ensureCanRead(claim, ctx);
    return this.buildDetail(claim);
  }

  async approvalPreview(id: string, ctx: RequestContext): Promise<ReimbursementApprovalPreview> {
    const claim = this.requireClaim(id);
    this.ensureCanRead(claim, ctx);
    return this.buildApprovalPreview(claim, this.repo.detail(claim));
  }

  async exportWord(id: string, ctx: RequestContext): Promise<ReimbursementExportFile> {
    const claim = this.requireClaim(id);
    this.ensureCanRead(claim, ctx);
    return renderReimbursementWord(this.buildDetail(claim));
  }

  async stats(query: ReimbursementStatsQuery, ctx: RequestContext): Promise<ReimbursementStats> {
    const userId = this.requireUserId(ctx);
    return this.repo.stats(query, userId, this.canViewReport(ctx, userId));
  }

  async create(input: CreateReimbursementClaimInput, ctx: RequestContext): Promise<ReimbursementClaimDetail> {
    const userId = this.requireUserId(ctx);
    this.ensurePermission(userId, "expense.submit", ctx);
    this.ensureRequiredClaimFields(input.claimType, input);
    const applicant = this.requireUser(userId);
    const department = input.departmentId?.trim()
      ? this.requireDepartment(input.departmentId)
      : this.requirePrimaryDepartment(userId);
    const now = nowIso();
    const items = this.buildItems(genId("pending"), input.claimType, input.items ?? [], now);
    const totalAmount = this.sumItems(items);
    const advanceAmount = input.advanceAmount ?? 0;
    const attachments = input.attachments ?? [];
    this.ensureUploadsExist(attachments);
    const claim: ReimbursementClaimEntity = {
      id: genId("rbc"),
      claimNo: this.generateClaimNo(input.claimType),
      claimType: input.claimType,
      status: "draft",
      applicantUserId: applicant.id,
      applicantName: applicant.displayName || applicant.username,
      departmentId: department.id,
      departmentName: department.name,
      reason: input.reason.trim(),
      fillDate: input.fillDate?.trim() || now.slice(0, 10),
      travelStartDate: input.travelStartDate?.trim() || null,
      travelStartHalf: input.travelStartHalf ?? null,
      travelEndDate: input.travelEndDate?.trim() || null,
      travelEndHalf: input.travelEndHalf ?? null,
      travelDays: input.travelDays ?? null,
      receiptCount: input.receiptCount ?? null,
      totalAmount,
      advanceAmount,
      balanceAmount: totalAmount - advanceAmount,
      currentStageCode: null,
      currentStageName: null,
      submittedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now
    };
    const claimItems = this.buildItems(claim.id, input.claimType, input.items ?? [], now);
    this.repo.transaction(() => {
      this.repo.createClaim(claim);
      this.repo.replaceItems(claim.id, claimItems);
      for (const attachment of attachments) {
        this.repo.addAttachment(genId("rba"), claim.id, attachment, ctx.userId ?? null, now);
        this.addLog(claim.id, ctx, "attachment.added", null, this.buildAttachmentAddedComment(attachment.uploadId), now);
      }
      this.addLog(claim.id, ctx, "create", null, "创建报销单", now);
    });
    const created = this.requireClaim(claim.id);
    await this.emitReimbursementEvent("created", created, ctx, {
      affectedUserIds: [created.applicantUserId]
    });
    return this.buildDetail(created);
  }

  async update(id: string, input: UpdateReimbursementClaimInput, ctx: RequestContext): Promise<ReimbursementClaimDetail> {
    const claim = this.requireClaim(id);
    this.ensureCanMutateDraft(claim, ctx);
    const department = input.departmentId ? this.requireDepartment(input.departmentId) : null;
    const now = nowIso();
    const items = input.items === undefined ? this.repo.listItems(claim.id) : this.buildItems(claim.id, claim.claimType, input.items, now);
    const totalAmount = this.sumItems(items);
    const advanceAmount = input.advanceAmount ?? claim.advanceAmount;
    const updated: ReimbursementClaimEntity = {
      ...claim,
      status: claim.status === "rejected" ? "draft" : claim.status,
      departmentId: department?.id ?? claim.departmentId,
      departmentName: department?.name ?? claim.departmentName,
      reason: input.reason?.trim() ?? claim.reason,
      fillDate: input.fillDate?.trim() ?? claim.fillDate,
      travelStartDate: input.travelStartDate === undefined ? claim.travelStartDate : input.travelStartDate?.trim() || null,
      travelStartHalf: input.travelStartHalf === undefined ? claim.travelStartHalf : input.travelStartHalf,
      travelEndDate: input.travelEndDate === undefined ? claim.travelEndDate : input.travelEndDate?.trim() || null,
      travelEndHalf: input.travelEndHalf === undefined ? claim.travelEndHalf : input.travelEndHalf,
      travelDays: input.travelDays === undefined ? claim.travelDays : input.travelDays,
      receiptCount: input.receiptCount === undefined ? claim.receiptCount : input.receiptCount,
      totalAmount,
      advanceAmount,
      balanceAmount: totalAmount - advanceAmount,
      currentStageCode: claim.status === "rejected" ? null : claim.currentStageCode,
      currentStageName: claim.status === "rejected" ? null : claim.currentStageName,
      submittedAt: claim.status === "rejected" ? null : claim.submittedAt,
      completedAt: null,
      updatedAt: now
    };
    this.ensureRequiredClaimFields(updated.claimType, updated);
    this.repo.transaction(() => {
      this.repo.updateClaim(updated);
      if (input.items !== undefined) {
        this.repo.replaceItems(claim.id, items);
      }
      if (claim.status === "rejected") {
        this.repo.cancelOpenTasks(claim.id, now);
      }
      this.addLog(claim.id, ctx, "update", null, "更新报销单", now);
    });
    const next = this.requireClaim(claim.id);
    await this.emitReimbursementEvent("updated", next, ctx, {
      affectedUserIds: this.collectReimbursementRelatedUserIds(next)
    });
    return this.buildDetail(next);
  }

  async submit(id: string, ctx: RequestContext, input: { comment?: string | null } = {}): Promise<ReimbursementClaimDetail> {
    const claim = this.requireClaim(id);
    this.ensureCanMutateDraft(claim, ctx);
    const template = this.requireDefaultTemplate();
    if (template.stages.length === 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `${DEFAULT_TEMPLATE_CODE} has no approval stages`, 400);
    }
    const now = nowIso();
    const firstStage = template.stages.slice().sort((left, right) => left.sort - right.sort)[0];
    if (!firstStage) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `${DEFAULT_TEMPLATE_CODE} has no approval stages`, 400);
    }
    const firstTasks = this.buildStageTasks(claim, template, firstStage, now);
    const firstTask = firstTasks[0];
    const updated: ReimbursementClaimEntity = {
      ...claim,
      status: "approving",
      currentStageCode: firstTask.stageCode,
      currentStageName: firstTask.stageName,
      submittedAt: now,
      completedAt: null,
      updatedAt: now
    };
    this.repo.transaction(() => {
      this.repo.deleteTasksForClaim(claim.id);
      this.repo.updateClaim(updated);
      this.repo.createTasks(firstTasks);
      this.addLog(claim.id, ctx, "submit", null, input.comment?.trim() || "提交审批", now);
    });
    const next = this.requireClaim(claim.id);
    await this.emitReimbursementEvent("submitted", next, ctx, {
      currentAssigneeUserIds: firstTasks.map((task) => task.assigneeUserId),
      affectedUserIds: this.uniqueUserIds([next.applicantUserId, ...firstTasks.map((task) => task.assigneeUserId)]),
      stageName: firstTask.stageName
    });
    return this.buildDetail(next);
  }

  async approve(id: string, input: ReimbursementActionInput, ctx: RequestContext): Promise<ReimbursementClaimDetail> {
    return this.handleApprovalAction(id, input, ctx, "approve");
  }

  async reject(id: string, input: ReimbursementActionInput, ctx: RequestContext): Promise<ReimbursementClaimDetail> {
    return this.handleApprovalAction(id, input, ctx, "reject");
  }

  async transfer(id: string, input: ReimbursementTransferInput, ctx: RequestContext): Promise<ReimbursementClaimDetail> {
    const claim = this.requireClaim(id);
    const task = this.requireActionableTask(input.taskId, claim.id, ctx);
    const target = this.requireUser(input.targetUserId);
    const now = nowIso();
    const updatedTask = { ...task, status: "transferred" as const, comment: input.comment?.trim() || null, actedAt: now, updatedAt: now };
    const newTask: ReimbursementApprovalTaskEntity = {
      ...task,
      id: genId("rbt"),
      assigneeUserId: target.id,
      assigneeName: target.displayName || target.username,
      status: "pending",
      transferredFromTaskId: task.id,
      comment: null,
      actedAt: null,
      createdAt: now,
      updatedAt: now
    };
    this.repo.transaction(() => {
      this.repo.updateTask(updatedTask);
      this.repo.createTasks([newTask]);
      this.addLog(claim.id, ctx, "transfer", task.id, input.comment?.trim() || `转交给 ${newTask.assigneeName}`, now);
    });
    const next = this.requireClaim(claim.id);
    await this.emitReimbursementEvent("transferred", next, ctx, {
      currentAssigneeUserIds: [newTask.assigneeUserId],
      previousAssigneeUserIds: [task.assigneeUserId],
      affectedUserIds: this.uniqueUserIds([next.applicantUserId, task.assigneeUserId, newTask.assigneeUserId]),
      stageName: newTask.stageName
    });
    return this.buildDetail(next);
  }

  async addSign(id: string, input: ReimbursementTransferInput, ctx: RequestContext): Promise<ReimbursementClaimDetail> {
    const claim = this.requireClaim(id);
    const task = this.requireActionableTask(input.taskId, claim.id, ctx);
    const target = this.requireUser(input.targetUserId);
    const now = nowIso();
    const addSignTask: ReimbursementApprovalTaskEntity = {
      ...task,
      id: genId("rbt"),
      assigneeUserId: target.id,
      assigneeName: target.displayName || target.username,
      status: "addsign_pending",
      parentTaskId: task.id,
      transferredFromTaskId: null,
      comment: null,
      actedAt: null,
      createdAt: now,
      updatedAt: now
    };
    this.repo.transaction(() => {
      this.repo.createTasks([addSignTask]);
      this.addLog(claim.id, ctx, "add_sign", task.id, input.comment?.trim() || `加签给 ${addSignTask.assigneeName}`, now);
    });
    const next = this.requireClaim(claim.id);
    await this.emitReimbursementEvent("add_sign", next, ctx, {
      currentAssigneeUserIds: [addSignTask.assigneeUserId],
      previousAssigneeUserIds: [task.assigneeUserId],
      affectedUserIds: this.uniqueUserIds([next.applicantUserId, task.assigneeUserId, addSignTask.assigneeUserId]),
      stageName: addSignTask.stageName
    });
    return this.buildDetail(next);
  }

  async attach(id: string, input: AttachReimbursementUploadInput, ctx: RequestContext): Promise<ReimbursementClaimDetail> {
    const claim = this.requireClaim(id);
    this.ensureCanEditOrApprove(claim, ctx);
    if (!this.repo.uploadExists(input.uploadId)) {
      throw new AppError(ERROR_CODES.UPLOAD_NOT_FOUND, `upload not found: ${input.uploadId}`, 404);
    }
    const now = nowIso();
    this.repo.transaction(() => {
      this.repo.addAttachment(genId("rba"), claim.id, input, ctx.userId ?? null, now);
      this.addLog(claim.id, ctx, "attachment.added", null, this.buildAttachmentAddedComment(input.uploadId), now);
    });
    const next = this.requireClaim(claim.id);
    await this.emitReimbursementEvent("attachment.added", next, ctx, {
      affectedUserIds: this.collectReimbursementRelatedUserIds(next)
    });
    return this.buildDetail(next);
  }

  async detach(id: string, attachmentId: string, ctx: RequestContext): Promise<ReimbursementClaimDetail> {
    const claim = this.requireClaim(id);
    this.ensureCanEditOrApprove(claim, ctx);
    const attachment = this.repo.findAttachmentById(claim.id, attachmentId);
    const now = nowIso();
    this.repo.transaction(() => {
      this.repo.deleteAttachment(claim.id, attachmentId);
      this.addLog(claim.id, ctx, "attachment.removed", null, this.buildAttachmentRemovedComment(attachment, attachmentId), now);
    });
    const next = this.requireClaim(claim.id);
    await this.emitReimbursementEvent("attachment.removed", next, ctx, {
      affectedUserIds: this.collectReimbursementRelatedUserIds(next)
    });
    return this.buildDetail(next);
  }

  private async handleApprovalAction(id: string, input: ReimbursementActionInput, ctx: RequestContext, action: "approve" | "reject"): Promise<ReimbursementClaimDetail> {
    const claim = this.requireClaim(id);
    const task = this.requireActionableTask(input.taskId, claim.id, ctx);
    const now = nowIso();
    const taskStatus = action === "approve" ? "approved" as const : "rejected" as const;
    const updatedTask = { ...task, status: taskStatus, comment: input.comment?.trim() || null, actedAt: now, updatedAt: now };
    const participantUserIdsBefore = this.collectReimbursementRelatedUserIds(claim);
    let nextTasks: ReimbursementApprovalTaskEntity[] = [];
    let completed = false;
    this.repo.transaction(() => {
      this.repo.updateTask(updatedTask);
      if (action === "reject") {
        this.repo.cancelOpenTasks(claim.id, now);
        this.repo.updateClaim({
          ...claim,
          status: "rejected",
          currentStageCode: task.stageCode,
          currentStageName: task.stageName,
          completedAt: null,
          updatedAt: now
        });
        this.addLog(claim.id, ctx, "reject", task.id, input.comment?.trim() || null, now);
        return;
      }
      this.addLog(claim.id, ctx, "approve", task.id, input.comment?.trim() || null, now);
      if (task.parentTaskId) {
        return;
      }
      for (const sibling of this.repo.findOpenSiblingTasks(task)) {
        if (sibling.id !== task.id) {
          this.repo.updateTask({ ...sibling, status: "cancelled", updatedAt: now });
        }
      }
      const result = this.advanceAfterApproval(claim, task, now);
      nextTasks = result.nextTasks;
      completed = result.completed;
    });
    const next = this.requireClaim(claim.id);
    if (action === "reject") {
      await this.emitReimbursementEvent("rejected", next, ctx, {
        previousAssigneeUserIds: [task.assigneeUserId],
        participantUserIds: participantUserIdsBefore,
        affectedUserIds: participantUserIdsBefore,
        stageName: task.stageName
      });
      return this.buildDetail(next);
    }

    if (completed) {
      await this.emitReimbursementEvent("completed", next, ctx, {
        previousAssigneeUserIds: [task.assigneeUserId],
        participantUserIds: participantUserIdsBefore,
        affectedUserIds: participantUserIdsBefore,
        stageName: task.stageName
      });
      return this.buildDetail(next);
    }

    await this.emitReimbursementEvent("approved", next, ctx, {
      previousAssigneeUserIds: [task.assigneeUserId],
      participantUserIds: participantUserIdsBefore,
      affectedUserIds: this.uniqueUserIds([...participantUserIdsBefore, ...nextTasks.map((item) => item.assigneeUserId)]),
      stageName: task.stageName
    });
    if (nextTasks.length > 0) {
      await this.emitReimbursementEvent("stage.pending", next, ctx, {
        currentAssigneeUserIds: nextTasks.map((item) => item.assigneeUserId),
        previousAssigneeUserIds: [task.assigneeUserId],
        affectedUserIds: this.uniqueUserIds([next.applicantUserId, ...nextTasks.map((item) => item.assigneeUserId)]),
        stageName: nextTasks[0]?.stageName ?? next.currentStageName ?? undefined
      });
    }
    return this.buildDetail(next);
  }

  private buildDetail(claim: ReimbursementClaimEntity): ReimbursementClaimDetail {
    const detail = this.repo.detail(claim);
    return {
      ...detail,
      approvalPreview: this.buildApprovalPreview(claim, detail)
    };
  }

  private advanceAfterApproval(
    claim: ReimbursementClaimEntity,
    task: ReimbursementApprovalTaskEntity,
    now: string
  ): { completed: boolean; nextTasks: ReimbursementApprovalTaskEntity[] } {
    const stages = this.repo.listTemplateStages(task.templateId);
    const nextStage = stages
      .filter((item) => item.sort > task.sort)
      .sort((left, right) => left.sort - right.sort)[0];
    if (!nextStage) {
      this.repo.updateClaim({
        ...claim,
        status: "completed",
        currentStageCode: null,
        currentStageName: null,
        completedAt: now,
        updatedAt: now
      });
      return { completed: true, nextTasks: [] };
    }
    const nextTasks = this.buildStageTasks(claim, { id: task.templateId }, nextStage, now);
    this.repo.createTasks(nextTasks);
    const nextTask = nextTasks[0];
    this.repo.updateClaim({
      ...claim,
      status: "approving",
      currentStageCode: nextTask?.stageCode ?? claim.currentStageCode,
      currentStageName: nextTask?.stageName ?? claim.currentStageName,
      updatedAt: now
    });
    return { completed: false, nextTasks };
  }

  private buildStageTasks(
    claim: ReimbursementClaimEntity,
    template: Pick<ApprovalTemplateWithStages, "id">,
    stage: ApprovalTemplateStage,
    now: string
  ): ReimbursementApprovalTaskEntity[] {
    return this.resolveAssignees(claim, stage).map((assignee) => ({
      id: genId("rbt"),
      claimId: claim.id,
      templateId: template.id,
      templateStageId: stage.id,
      stageCode: stage.stageCode,
      stageName: stage.stageName,
      stageType: stage.stageType,
      resolverType: stage.resolverType,
      resolverRef: stage.resolverRef,
      assigneeUserId: assignee.id,
      assigneeName: assignee.displayName || assignee.username,
      status: "pending",
      sort: stage.sort,
      parentTaskId: null,
      transferredFromTaskId: null,
      comment: null,
      actedAt: null,
      createdAt: now,
      updatedAt: now
    }));
  }

  private buildApprovalPreview(
    claim: ReimbursementClaimEntity,
    detail: Omit<ReimbursementClaimDetail, "approvalPreview">
  ): ReimbursementApprovalPreview {
    const template = this.requireDefaultTemplate();
    const orderedStages = template.stages.slice().sort((left, right) => left.sort - right.sort);
    const currentStageIndex = orderedStages.findIndex((stage) => stage.stageCode === claim.currentStageCode);
    const nodes: ReimbursementApprovalPreview["nodes"] = [
      {
        stageCode: "applicant",
        stageName: "报销人/出差人",
        status: this.resolveApplicantPreviewStatus(claim.status),
        assignees: [{ userId: claim.applicantUserId, name: claim.applicantName }]
      },
      ...orderedStages.map((stage, index) => ({
        stageCode: stage.stageCode,
        stageName: stage.stageName,
        status: this.resolveStagePreviewStatus(claim, index, currentStageIndex),
        assignees: detail.tasks
          .filter((task) => !task.parentTaskId && task.stageCode === stage.stageCode)
          .map((task) => ({ userId: task.assigneeUserId, name: task.assigneeName }))
      })),
      {
        stageCode: "completed",
        stageName: "完成",
        status: (claim.status === "completed" ? "approved" : "pending") as ReimbursementApprovalPreviewNodeStatus,
        assignees: []
      }
    ];
    return {
      claimId: claim.id,
      claimStatus: claim.status,
      currentStageCode: claim.currentStageCode,
      currentStageName: claim.currentStageName,
      nodes
    };
  }

  private resolveApplicantPreviewStatus(status: ReimbursementClaimEntity["status"]): ReimbursementApprovalPreviewNodeStatus {
    if (status === "draft") {
      return "current";
    }
    if (status === "cancelled") {
      return "cancelled";
    }
    return "approved";
  }

  private resolveStagePreviewStatus(
    claim: ReimbursementClaimEntity,
    stageIndex: number,
    currentStageIndex: number
  ): ReimbursementApprovalPreviewNodeStatus {
    if (claim.status === "draft" || claim.status === "submitted") {
      return stageIndex === 0 ? "pending" : "pending";
    }
    if (claim.status === "completed") {
      return "approved";
    }
    if (claim.status === "cancelled") {
      if (currentStageIndex >= 0 && stageIndex < currentStageIndex) {
        return "approved";
      }
      return stageIndex === currentStageIndex ? "cancelled" : "pending";
    }
    if (claim.status === "rejected") {
      if (currentStageIndex >= 0 && stageIndex < currentStageIndex) {
        return "approved";
      }
      return stageIndex === currentStageIndex ? "rejected" : "pending";
    }
    if (currentStageIndex >= 0 && stageIndex < currentStageIndex) {
      return "approved";
    }
    if (stageIndex === currentStageIndex) {
      return "current";
    }
    return "pending";
  }

  private resolveAssignees(claim: ReimbursementClaimEntity, stage: ApprovalTemplateStage): UserApprovalProfile[] {
    const applicant = this.requireUser(claim.applicantUserId);
    if (stage.resolverType === "direct_manager") {
      return [this.requireConfiguredUser(applicant.managerUserId, `${stage.stageName} direct manager`)];
    }
    if (stage.resolverType === "department_manager" || stage.resolverType === "department_chain") {
      const department = this.requireDepartment(claim.departmentId);
      return [this.requireConfiguredUser(department.managerUserId, `${stage.stageName} department manager`)];
    }
    if (stage.resolverType === "system_role") {
      if (!stage.resolverRef) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `${stage.stageName} resolverRef is required`, 400);
      }
      const users = this.repo.listActiveRoleUsers(stage.resolverRef);
      if (users.length === 0) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `${stage.stageName} has no active role members`, 400);
      }
      return users;
    }
    throw new AppError(ERROR_CODES.BAD_REQUEST, `unsupported resolver type: ${stage.resolverType}`, 400);
  }

  private buildItems(claimId: string, claimType: "travel" | "general", inputs: ReimbursementItemInput[], now: string): ReimbursementItemEntity[] {
    return inputs.map((input, index) => ({
      id: genId("rbi"),
      claimId,
      itemType: input.itemType ?? claimType,
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      occurredDate: input.occurredDate?.trim() || null,
      startDate: input.startDate?.trim() || null,
      endDate: input.endDate?.trim() || null,
      fromLocation: input.fromLocation?.trim() || null,
      toLocation: input.toLocation?.trim() || null,
      amount: input.amount ?? 0,
      meta: (input.itemType ?? claimType) === "travel" ? normalizeTravelItemMeta(input.meta) : null,
      sort: input.sort ?? (index + 1) * 10,
      createdAt: now,
      updatedAt: now
    }));
  }

  private sumItems(items: ReimbursementItemEntity[]): number {
    return Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  }

  private ensureRequiredClaimFields(
    claimType: "travel" | "general",
    data: {
      travelStartDate?: string | null;
      travelStartHalf?: "am" | "pm" | null;
      travelEndDate?: string | null;
      travelEndHalf?: "am" | "pm" | null;
      travelDays?: number | null;
      receiptCount?: number | null;
    }
  ): void {
    if (claimType !== "travel") {
      return;
    }
    if (!data.travelStartDate?.trim()) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "travelStartDate is required for travel claims", 400);
    }
    if (!data.travelStartHalf) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "travelStartHalf is required for travel claims", 400);
    }
    if (!data.travelEndDate?.trim()) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "travelEndDate is required for travel claims", 400);
    }
    if (!data.travelEndHalf) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "travelEndHalf is required for travel claims", 400);
    }
    if (data.travelDays == null) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "travelDays is required for travel claims", 400);
    }
  }

  private ensureUploadsExist(attachments: AttachReimbursementUploadInput[]): void {
    for (const attachment of attachments) {
      if (!this.repo.uploadExists(attachment.uploadId)) {
        throw new AppError(ERROR_CODES.UPLOAD_NOT_FOUND, `upload not found: ${attachment.uploadId}`, 404);
      }
    }
  }

  private generateClaimNo(claimType: "travel" | "general"): string {
    const prefix = `${claimType === "travel" ? "CL" : "BX"}-${new Date().toISOString().slice(0, 7).replace("-", "")}-`;
    return `${prefix}${String(this.repo.nextClaimSequence(prefix)).padStart(3, "0")}`;
  }

  private buildAttachmentAddedComment(uploadId: string): string {
    return `上传${this.resolveUploadDisplayName(this.repo.findUploadDisplayInfo(uploadId), uploadId)}`;
  }

  private buildAttachmentRemovedComment(
    attachment: { fileName: string | null; originalName: string | null } | null,
    fallbackAttachmentId: string
  ): string {
    return `移除附件${this.resolveUploadDisplayName(attachment, fallbackAttachmentId)}`;
  }

  private resolveUploadDisplayName(
    upload: Pick<UploadDisplayInfo, "fileName" | "originalName"> | null,
    fallback: string
  ): string {
    return upload?.originalName?.trim() || upload?.fileName?.trim() || fallback;
  }

  private requireClaim(id: string): ReimbursementClaimEntity {
    const claim = this.repo.findClaimById(id);
    if (!claim) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `reimbursement claim not found: ${id}`, 404);
    }
    return claim;
  }

  private requireUser(userId: string): UserApprovalProfile {
    const user = this.repo.findUserProfile(userId);
    if (!user) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${userId}`, 404);
    }
    return user;
  }

  private requireConfiguredUser(userId: string | null | undefined, label: string): UserApprovalProfile {
    if (!userId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `${label} is not configured`, 400);
    }
    return this.requireUser(userId);
  }

  private requireDepartment(departmentId: string) {
    const department = this.repo.findDepartmentProfile(departmentId);
    if (!department) {
      throw new AppError(ERROR_CODES.ORGANIZATION_DEPARTMENT_NOT_FOUND, `department not found: ${departmentId}`, 404);
    }
    return department;
  }

  private requirePrimaryDepartment(userId: string) {
    const department = this.repo.findPrimaryDepartmentForUser(userId);
    if (!department) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "primary department is required to create reimbursement claim", 400);
    }
    return department;
  }

  private requireDefaultTemplate(): ApprovalTemplateWithStages {
    const template = this.repo.findDefaultTemplate();
    if (!template) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `${DEFAULT_TEMPLATE_CODE} approval template is not configured`, 400);
    }
    return template;
  }

  private requireActionableTask(taskId: string, claimId: string, ctx: RequestContext): ReimbursementApprovalTaskEntity {
    const userId = this.requireUserId(ctx);
    const task = this.repo.findTaskById(taskId);
    if (!task || task.claimId !== claimId) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `approval task not found: ${taskId}`, 404);
    }
    if (task.assigneeUserId !== userId && !this.canBypassApprovalAssignee(ctx, userId)) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "approval task assignee mismatch", 403);
    }
    if (task.status !== "pending" && task.status !== "addsign_pending") {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "approval task is not pending", 400);
    }
    return task;
  }

  private ensureCanRead(claim: ReimbursementClaimEntity, ctx: RequestContext): void {
    const userId = this.requireUserId(ctx);
    if (claim.applicantUserId === userId || this.canSeeAll(ctx, userId)) {
      return;
    }
    const task = this.repo.listTasks(claim.id).find((item) => item.assigneeUserId === userId);
    if (!task) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "reimbursement claim forbidden", 403);
    }
  }

  private ensureCanMutateDraft(claim: ReimbursementClaimEntity, ctx: RequestContext): void {
    const userId = this.requireUserId(ctx);
    if (claim.applicantUserId !== userId && !this.canBypassApprovalAssignee(ctx, userId)) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "reimbursement claim applicant required", 403);
    }
    if (claim.status !== "draft" && claim.status !== "rejected") {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "only draft or rejected claims can be edited", 400);
    }
  }

  private ensureCanEditOrApprove(claim: ReimbursementClaimEntity, ctx: RequestContext): void {
    const userId = this.requireUserId(ctx);
    if (claim.applicantUserId === userId || this.canBypassApprovalAssignee(ctx, userId)) {
      return;
    }
    const task = this.repo.listTasks(claim.id).find((item) => item.assigneeUserId === userId && (item.status === "pending" || item.status === "addsign_pending"));
    if (!task) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "reimbursement attachment forbidden", 403);
    }
  }

  private canSeeAll(ctx: RequestContext, userId: string): boolean {
    return this.canBypassApprovalAssignee(ctx, userId) || this.repo.userHasPermission(userId, "expense.report.view");
  }

  private canViewReport(ctx: RequestContext, userId: string): boolean {
    return this.canSeeAll(ctx, userId);
  }

  private ensurePermission(userId: string, permission: string, ctx: RequestContext): void {
    if (this.canBypassApprovalAssignee(ctx, userId) || this.repo.userHasPermission(userId, permission)) {
      return;
    }
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, `${permission} required`, 403);
  }

  private canBypassApprovalAssignee(ctx: RequestContext, userId: string): boolean {
    return (
      this.repo.userHasPermission(userId, "project.manage.all") ||
      this.repo.userHasPermission(userId, "expense.review.manage")
    );
  }

  private requireUserId(ctx: RequestContext): string {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "user context required", 403);
    }
    return userId;
  }

  private collectReimbursementRelatedUserIds(claim: ReimbursementClaimEntity): string[] {
    return this.uniqueUserIds([
      claim.applicantUserId,
      ...this.repo.listTasks(claim.id).map((task) => task.assigneeUserId)
    ]);
  }

  private uniqueUserIds(userIds: Array<string | null | undefined>): string[] {
    return Array.from(new Set(userIds.map((item) => item?.trim() ?? "").filter(Boolean)));
  }

  private async emitReimbursementEvent(
    action: string,
    claim: ReimbursementClaimEntity,
    ctx: RequestContext,
    options: {
      currentAssigneeUserIds?: string[];
      previousAssigneeUserIds?: string[];
      participantUserIds?: string[];
      affectedUserIds?: string[];
      stageName?: string | null;
    } = {}
  ): Promise<void> {
    if (!this.eventBus) {
      return;
    }
    const participantUserIds = this.uniqueUserIds(options.participantUserIds ?? this.collectReimbursementRelatedUserIds(claim));
    const affectedUserIds = this.uniqueUserIds(options.affectedUserIds ?? participantUserIds);
    await this.eventBus.emit({
      type: `reimbursement.${action}`,
      scope: "global",
      entityType: "reimbursement",
      entityId: claim.id,
      action,
      actorId: ctx.userId ?? undefined,
      occurredAt: claim.updatedAt || nowIso(),
      payload: {
        claimId: claim.id,
        claimNo: claim.claimNo,
        claimType: claim.claimType,
        title: claim.reason,
        reason: claim.reason,
        applicantUserId: claim.applicantUserId,
        applicantName: claim.applicantName,
        currentAssigneeUserIds: this.uniqueUserIds(options.currentAssigneeUserIds ?? []),
        previousAssigneeUserIds: this.uniqueUserIds(options.previousAssigneeUserIds ?? []),
        participantUserIds,
        affectedUserIds,
        stageName: options.stageName ?? claim.currentStageName,
        totalAmount: claim.totalAmount
      }
    });
  }

  private addLog(claimId: string, ctx: RequestContext, action: ReimbursementLogAction, taskId: string | null, comment: string | null, createdAt: string): void {
    this.repo.addLog({
      id: genId("rbl"),
      claimId,
      actorUserId: ctx.userId ?? null,
      actorName: ctx.nickname?.trim() || ctx.userId || ctx.accountId,
      action,
      taskId,
      comment,
      createdAt
    });
  }
}
