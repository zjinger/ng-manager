import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ReimbursementCommandContract, ReimbursementQueryContract } from "./reimbursement.contract";
import type {
  AttachReimbursementUploadInput,
  CreateReimbursementClaimInput,
  ListReimbursementClaimsQuery,
  ReimbursementActionInput,
  ReimbursementApprovalTaskEntity,
  ReimbursementClaimDetail,
  ReimbursementClaimEntity,
  ReimbursementExportFile,
  ReimbursementClaimListResult,
  ReimbursementDashboard,
  ReimbursementStats,
  ReimbursementStatsQuery,
  ReimbursementTransferInput,
  UpdateReimbursementClaimInput
} from "./reimbursement.types";
import { ReimbursementRepo } from "./reimbursement.repo";
import type { ApprovalTemplateStage, ApprovalTemplateWithStages, UserApprovalProfile } from "./reimbursement.repo";
import type { ReimbursementItemEntity, ReimbursementItemInput, ReimbursementLogAction } from "./reimbursement.types";
import { renderReimbursementWord } from "./reimbursement-word-export";

const DEFAULT_TEMPLATE_CODE = "expense_default";

export class ReimbursementService implements ReimbursementCommandContract, ReimbursementQueryContract {
  constructor(private readonly repo: ReimbursementRepo) {}

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
    return this.repo.detail(claim);
  }

  async exportWord(id: string, ctx: RequestContext): Promise<ReimbursementExportFile> {
    const claim = this.requireClaim(id);
    this.ensureCanRead(claim, ctx);
    return renderReimbursementWord(this.repo.detail(claim));
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
      this.addLog(claim.id, ctx, "create", null, "create reimbursement claim", now);
    });
    return this.repo.detail(this.requireClaim(claim.id));
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
      this.addLog(claim.id, ctx, "update", null, "update reimbursement claim", now);
    });
    return this.repo.detail(this.requireClaim(claim.id));
  }

  async submit(id: string, ctx: RequestContext): Promise<ReimbursementClaimDetail> {
    const claim = this.requireClaim(id);
    this.ensureCanMutateDraft(claim, ctx);
    const template = this.requireDefaultTemplate();
    if (template.stages.length === 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `${DEFAULT_TEMPLATE_CODE} has no approval stages`, 400);
    }
    const now = nowIso();
    const tasks = this.buildApprovalTasks(claim, template, now);
    const firstSort = Math.min(...tasks.map((task) => task.sort));
    const firstTasks = tasks.filter((task) => task.sort === firstSort);
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
      this.repo.createTasks(tasks);
      this.addLog(claim.id, ctx, "submit", null, "submit reimbursement claim", now);
    });
    return this.repo.detail(this.requireClaim(claim.id));
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
      this.addLog(claim.id, ctx, "transfer", task.id, input.comment?.trim() || `transfer to ${newTask.assigneeName}`, now);
    });
    return this.repo.detail(this.requireClaim(claim.id));
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
      this.addLog(claim.id, ctx, "add_sign", task.id, input.comment?.trim() || `add sign ${addSignTask.assigneeName}`, now);
    });
    return this.repo.detail(this.requireClaim(claim.id));
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
      this.addLog(claim.id, ctx, "attachment.added", null, input.uploadId, now);
    });
    return this.repo.detail(this.requireClaim(claim.id));
  }

  async detach(id: string, attachmentId: string, ctx: RequestContext): Promise<ReimbursementClaimDetail> {
    const claim = this.requireClaim(id);
    this.ensureCanEditOrApprove(claim, ctx);
    const now = nowIso();
    this.repo.transaction(() => {
      this.repo.deleteAttachment(claim.id, attachmentId);
      this.addLog(claim.id, ctx, "attachment.removed", null, attachmentId, now);
    });
    return this.repo.detail(this.requireClaim(claim.id));
  }

  private handleApprovalAction(id: string, input: ReimbursementActionInput, ctx: RequestContext, action: "approve" | "reject"): ReimbursementClaimDetail {
    const claim = this.requireClaim(id);
    const task = this.requireActionableTask(input.taskId, claim.id, ctx);
    const now = nowIso();
    const taskStatus = action === "approve" ? "approved" as const : "rejected" as const;
    const updatedTask = { ...task, status: taskStatus, comment: input.comment?.trim() || null, actedAt: now, updatedAt: now };
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
      this.advanceAfterApproval(claim, task, now);
    });
    return this.repo.detail(this.requireClaim(claim.id));
  }

  private advanceAfterApproval(claim: ReimbursementClaimEntity, task: ReimbursementApprovalTaskEntity, now: string): void {
    const tasks = this.repo.listTasks(claim.id).filter((item) => !item.parentTaskId);
    const nextSort = tasks
      .map((item) => item.sort)
      .filter((sort) => sort > task.sort)
      .sort((left, right) => left - right)[0];
    if (nextSort === undefined) {
      this.repo.updateClaim({
        ...claim,
        status: "completed",
        currentStageCode: null,
        currentStageName: null,
        completedAt: now,
        updatedAt: now
      });
      return;
    }
    const nextTasks = this.repo.activateTasksBySort(claim.id, nextSort, now);
    const nextTask = nextTasks[0];
    this.repo.updateClaim({
      ...claim,
      status: "approving",
      currentStageCode: nextTask?.stageCode ?? claim.currentStageCode,
      currentStageName: nextTask?.stageName ?? claim.currentStageName,
      updatedAt: now
    });
  }

  private buildApprovalTasks(claim: ReimbursementClaimEntity, template: ApprovalTemplateWithStages, now: string): ReimbursementApprovalTaskEntity[] {
    const tasks: ReimbursementApprovalTaskEntity[] = [];
    const firstSort = Math.min(...template.stages.map((stage) => stage.sort));
    for (const stage of template.stages) {
      const assignees = this.resolveAssignees(claim, stage);
      for (const assignee of assignees) {
        tasks.push({
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
          status: stage.sort === firstSort ? "pending" : "cancelled",
          sort: stage.sort,
          parentTaskId: null,
          transferredFromTaskId: null,
          comment: null,
          actedAt: null,
          createdAt: now,
          updatedAt: now
        });
      }
    }
    return tasks;
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
    if (stage.resolverType === "finance_approver") {
      return [this.requireConfiguredUser(applicant.financeApproverUserId, `${stage.stageName} finance approver`)];
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
      meta: input.meta ?? null,
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

  private generateClaimNo(claimType: "travel" | "general"): string {
    const prefix = `${claimType === "travel" ? "CL" : "BX"}-${new Date().toISOString().slice(0, 7).replace("-", "")}-`;
    return `${prefix}${String(this.repo.nextClaimSequence(prefix)).padStart(3, "0")}`;
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
    if (task.assigneeUserId !== userId && !ctx.roles.includes("admin")) {
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
    if (claim.applicantUserId !== userId && !ctx.roles.includes("admin")) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "reimbursement claim applicant required", 403);
    }
    if (claim.status !== "draft" && claim.status !== "rejected") {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "only draft or rejected claims can be edited", 400);
    }
  }

  private ensureCanEditOrApprove(claim: ReimbursementClaimEntity, ctx: RequestContext): void {
    const userId = this.requireUserId(ctx);
    if (claim.applicantUserId === userId || ctx.roles.includes("admin")) {
      return;
    }
    const task = this.repo.listTasks(claim.id).find((item) => item.assigneeUserId === userId && (item.status === "pending" || item.status === "addsign_pending"));
    if (!task) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "reimbursement attachment forbidden", 403);
    }
  }

  private canSeeAll(ctx: RequestContext, userId: string): boolean {
    return ctx.roles.includes("admin") || this.repo.userHasPermission(userId, "expense.report.view");
  }

  private canViewReport(ctx: RequestContext, userId: string): boolean {
    return this.canSeeAll(ctx, userId);
  }

  private ensurePermission(userId: string, permission: string, ctx: RequestContext): void {
    if (ctx.roles.includes("admin") || this.repo.userHasPermission(userId, permission)) {
      return;
    }
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, `${permission} required`, 403);
  }

  private requireUserId(ctx: RequestContext): string {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "user context required", 403);
    }
    return userId;
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
