import fs from "node:fs";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { IssueCommandContract } from "../issue/issue.contract";
import type { IssuePriority, IssueType } from "../issue/issue.types";
import type { ProjectAccessContract } from "../project/project-access.contract";
import type { UploadQueryContract } from "../upload/upload.contract";
import type { RdCommandContract } from "./rd.contract";
import type { RdItemPriority, RdItemType } from "./rd.types";
import type { RdTaskSheetCommandContract, RdTaskSheetQueryContract } from "./rd-task-sheet.contract";
import { RdTaskSheetRepo } from "./rd-task-sheet.repo";
import { parseRdTaskSheetWord } from "./rd-task-sheet-word-import";
import { renderRdTaskSheetWord } from "./rd-task-sheet-word-export";
import type {
  AttachRdTaskSheetUploadInput,
  CloseRdTaskSheetInput,
  ConvertRdTaskSheetToIssueInput,
  ConvertRdTaskSheetToRdItemInput,
  CreateRdTaskSheetDefaultRouteInput,
  CreateRdTaskSheetInput,
  ListRdTaskSheetDefaultRoutesQuery,
  ListRdTaskSheetsQuery,
  PreviewRdTaskSheetImportInput,
  PreviewRdTaskSheetImportResult,
  RdTaskSheetDefaultRouteEntity,
  RdTaskSheetAction,
  RdTaskSheetDetail,
  RdTaskSheetEntity,
  RdTaskSheetListResult,
  RenderedRdTaskSheetWord,
  ReplyRdTaskSheetInput,
  UpdateRdTaskSheetDefaultRouteInput,
  UpdateRdTaskSheetInput,
  UserDisplayProfile
} from "./rd-task-sheet.types";

const SUBMIT_PERMISSION = "task_sheet.submit";
const VIEW_SELF_PERMISSION = "task_sheet.view.self";
const MANAGE_PERMISSION = "task_sheet.manage";

export class RdTaskSheetService implements RdTaskSheetCommandContract, RdTaskSheetQueryContract {
  constructor(
    private readonly repo: RdTaskSheetRepo,
    private readonly projectAccess: ProjectAccessContract,
    private readonly uploadQuery: UploadQueryContract,
    private readonly rdCommand?: RdCommandContract,
    private readonly issueCommand?: IssueCommandContract
  ) {}

  async create(input: CreateRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail> {
    this.requireAnyPermission(ctx, [SUBMIT_PERMISSION, MANAGE_PERMISSION]);
    const creator = this.requireCurrentUser(ctx);
    const projectId = await this.resolveProjectId(input.projectId, ctx, "create rd task sheet");
    const issuer = this.resolveOptionalUser(input.issuerUserId ?? null);
    const receiver = this.resolveOptionalUser(input.receiverUserId ?? null);
    const processor = this.resolveOptionalUser(input.processorUserId ?? null);
    const now = nowIso();
    const hasImportedReply = Boolean(input.deliveryContent?.trim() || input.result || input.resolvedAt?.trim());
    const sheetNo = normalizeNullable(input.sheetNo) || this.getNextSheetNo();
    this.ensureSheetNoUnique(sheetNo);
    const entity: RdTaskSheetEntity = {
      id: genId("rdts"),
      projectId,
      sheetNo,
      status: hasImportedReply ? "replied" : "draft",
      title: input.title.trim(),
      issueDate: input.issueDate?.trim() || now.slice(0, 10),
      issuerDepartment: normalizeNullable(input.issuerDepartment),
      issuerUserId: issuer?.id ?? normalizeNullable(input.issuerUserId),
      issuerName: normalizeNullable(input.issuerName) || userDisplayName(issuer) || creator.name,
      receiverDepartment: normalizeNullable(input.receiverDepartment),
      receiverUserId: receiver?.id ?? normalizeNullable(input.receiverUserId),
      receiverName: normalizeNullable(input.receiverName) || userDisplayName(receiver),
      receiverPhone: normalizeNullable(input.receiverPhone),
      processorUserId: processor?.id ?? normalizeNullable(input.processorUserId),
      processorName: userDisplayName(processor),
      customerCompany: normalizeNullable(input.customerCompany),
      customerContact: normalizeNullable(input.customerContact),
      customerPhone: normalizeNullable(input.customerPhone),
      projectName: normalizeNullable(input.projectName),
      projectContact: normalizeNullable(input.projectContact),
      relatedSystem: normalizeNullable(input.relatedSystem),
      urgency: input.urgency ?? "normal",
      businessType: input.businessType ?? "technical_service",
      expectedResolvedAt: normalizeNullable(input.expectedResolvedAt),
      resolvedAt: hasImportedReply ? normalizeNullable(input.resolvedAt) || now : null,
      result: input.result ?? null,
      businessDescription: input.businessDescription.trim(),
      deliveryContent: normalizeNullable(input.deliveryContent),
      closeReason: null,
      convertedRdItemId: null,
      convertedIssueId: null,
      creatorId: creator.id,
      creatorName: creator.name,
      issuedAt: null,
      processingStartedAt: null,
      repliedAt: hasImportedReply ? now : null,
      closedAt: null,
      createdAt: now,
      updatedAt: now
    };

    for (const attachment of input.attachments ?? []) {
      await this.uploadQuery.getById(attachment.uploadId, ctx);
    }

    this.repo.transaction(() => {
      this.repo.create(entity);
      for (const attachment of input.attachments ?? []) {
        this.addAttachmentRecord(entity.id, attachment.uploadId, creator.id, now);
      }
      this.createLog(entity.id, "create", ctx, `创建任务单 ${entity.sheetNo}`, now);
    });
    return this.requireDetail(entity.id);
  }

  async update(id: string, input: UpdateRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail> {
    const current = await this.requireEntityWithAccess(id, ctx);
    this.requireEditAccess(current, ctx);
    const projectId = input.projectId === undefined ? current.projectId : await this.resolveProjectId(input.projectId, ctx, "update rd task sheet");
    const issuer = input.issuerUserId === undefined ? null : this.resolveOptionalUser(input.issuerUserId);
    const receiver = input.receiverUserId === undefined ? null : this.resolveOptionalUser(input.receiverUserId);
    const processor = input.processorUserId === undefined ? null : this.resolveOptionalUser(input.processorUserId);
    const now = nowIso();
    const nextSheetNo = input.sheetNo === undefined ? current.sheetNo : normalizeNullable(input.sheetNo) || current.sheetNo;
    this.ensureSheetNoUnique(nextSheetNo, id);
    const updated = this.repo.update(id, {
      project_id: projectId,
      sheet_no: nextSheetNo,
      title: input.title?.trim() || current.title,
      issue_date: input.issueDate?.trim() || current.issueDate,
      issuer_department: input.issuerDepartment === undefined ? current.issuerDepartment : normalizeNullable(input.issuerDepartment),
      issuer_user_id: input.issuerUserId === undefined ? current.issuerUserId : issuer?.id ?? normalizeNullable(input.issuerUserId),
      issuer_name:
        input.issuerName === undefined && input.issuerUserId === undefined
          ? current.issuerName
          : normalizeNullable(input.issuerName) || userDisplayName(issuer) || current.issuerName,
      receiver_department: input.receiverDepartment === undefined ? current.receiverDepartment : normalizeNullable(input.receiverDepartment),
      receiver_user_id: input.receiverUserId === undefined ? current.receiverUserId : receiver?.id ?? normalizeNullable(input.receiverUserId),
      receiver_name:
        input.receiverName === undefined && input.receiverUserId === undefined
          ? current.receiverName
          : normalizeNullable(input.receiverName) || userDisplayName(receiver),
      receiver_phone: input.receiverPhone === undefined ? current.receiverPhone : normalizeNullable(input.receiverPhone),
      processor_user_id: input.processorUserId === undefined ? current.processorUserId : processor?.id ?? normalizeNullable(input.processorUserId),
      processor_name: input.processorUserId === undefined ? current.processorName : userDisplayName(processor),
      customer_company: input.customerCompany === undefined ? current.customerCompany : normalizeNullable(input.customerCompany),
      customer_contact: input.customerContact === undefined ? current.customerContact : normalizeNullable(input.customerContact),
      customer_phone: input.customerPhone === undefined ? current.customerPhone : normalizeNullable(input.customerPhone),
      project_name: input.projectName === undefined ? current.projectName : normalizeNullable(input.projectName),
      project_contact: input.projectContact === undefined ? current.projectContact : normalizeNullable(input.projectContact),
      related_system: input.relatedSystem === undefined ? current.relatedSystem : normalizeNullable(input.relatedSystem),
      urgency: input.urgency ?? current.urgency,
      business_type: input.businessType ?? current.businessType,
      expected_resolved_at: input.expectedResolvedAt === undefined ? current.expectedResolvedAt : normalizeNullable(input.expectedResolvedAt),
      business_description: input.businessDescription?.trim() || current.businessDescription,
      updated_at: now
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, "failed to update rd task sheet", 500);
    }
    this.createLog(id, "update", ctx, "更新任务单", now);
    return this.requireDetail(id);
  }

  async issue(id: string, ctx: RequestContext): Promise<RdTaskSheetDetail> {
    this.requireAnyPermission(ctx, [SUBMIT_PERMISSION, MANAGE_PERMISSION]);
    const current = await this.requireEntityWithAccess(id, ctx);
    if (!this.isManager(ctx) && current.creatorId !== currentUserId(ctx) && current.issuerUserId !== currentUserId(ctx)) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "issue task sheet forbidden", 403);
    }
    this.requireStatus(current, ["draft"], "issue task sheet");
    const now = nowIso();
    this.repo.update(id, { status: "issued", issued_at: now, updated_at: now });
    this.createLog(id, "issue", ctx, "下发任务单", now);
    return this.requireDetail(id);
  }

  async startProcessing(id: string, ctx: RequestContext): Promise<RdTaskSheetDetail> {
    const current = await this.requireEntityWithAccess(id, ctx);
    this.requireHandlerAccess(current, ctx, "start processing task sheet");
    this.requireStatus(current, ["issued"], "start processing task sheet");
    const actor = this.requireCurrentUser(ctx);
    const now = nowIso();
    this.repo.update(id, {
      status: "processing",
      processor_user_id: actor.id,
      processor_name: actor.name,
      processing_started_at: now,
      updated_at: now
    });
    this.createLog(id, "start_processing", ctx, "开始处理任务单", now);
    return this.requireDetail(id);
  }

  async reply(id: string, input: ReplyRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail> {
    const current = await this.requireEntityWithAccess(id, ctx);
    this.requireHandlerAccess(current, ctx, "reply task sheet");
    this.requireStatus(current, ["issued", "processing"], "reply task sheet");
    const actor = this.requireCurrentUser(ctx);
    const now = nowIso();
    this.repo.update(id, {
      status: "replied",
      result: input.result,
      resolved_at: normalizeNullable(input.resolvedAt) || now,
      delivery_content: input.deliveryContent.trim(),
      processor_user_id: current.processorUserId || actor.id,
      processor_name: current.processorName || actor.name,
      replied_at: now,
      updated_at: now
    });
    this.createLog(id, "reply", ctx, input.result === "resolved" ? "任务单已解决并回复" : "任务单未解决并回复", now);
    return this.requireDetail(id);
  }

  async close(id: string, input: CloseRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail> {
    const current = await this.requireEntityWithAccess(id, ctx);
    if (!this.isManager(ctx) && !this.isRelatedUser(current, currentUserId(ctx))) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "close task sheet forbidden", 403);
    }
    if (current.status === "closed") {
      return this.requireDetail(id);
    }
    if (!this.isManager(ctx)) {
      this.requireStatus(current, ["replied"], "close task sheet");
    }
    const now = nowIso();
    this.repo.update(id, {
      status: "closed",
      close_reason: normalizeNullable(input.reason),
      closed_at: now,
      updated_at: now
    });
    this.createLog(id, "close", ctx, normalizeNullable(input.reason) || "关闭任务单", now);
    return this.requireDetail(id);
  }

  async attach(id: string, input: AttachRdTaskSheetUploadInput, ctx: RequestContext): Promise<RdTaskSheetDetail> {
    const current = await this.requireEntityWithAccess(id, ctx);
    this.requireMutableAccess(current, ctx, "attach task sheet upload");
    const actor = this.requireCurrentUser(ctx);
    const now = nowIso();
    await this.uploadQuery.getById(input.uploadId, ctx);
    this.repo.transaction(() => {
      this.addAttachmentRecord(id, input.uploadId, actor.id, now);
      this.createLog(id, "attachment.added", ctx, "添加附件", now, { uploadId: input.uploadId });
    });
    return this.requireDetail(id);
  }

  async detach(id: string, attachmentId: string, ctx: RequestContext): Promise<RdTaskSheetDetail> {
    const current = await this.requireEntityWithAccess(id, ctx);
    this.requireMutableAccess(current, ctx, "remove task sheet upload");
    const now = nowIso();
    const removed = this.repo.deleteAttachment(id, attachmentId);
    if (!removed) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "task sheet attachment not found", 404);
    }
    this.createLog(id, "attachment.removed", ctx, "删除附件", now, { attachmentId });
    return this.requireDetail(id);
  }

  async list(query: ListRdTaskSheetsQuery, ctx: RequestContext): Promise<RdTaskSheetListResult> {
    this.requireAnyPermission(ctx, [VIEW_SELF_PERMISSION, MANAGE_PERMISSION]);
    if (query.projectId?.trim()) {
      await this.projectAccess.requireProjectAccess(query.projectId.trim(), ctx, "list rd task sheets");
    }
    const canManageAll = this.isManager(ctx) && query.scope !== "related";
    const accessibleProjectIds = canManageAll ? [] : await this.projectAccess.listAccessibleProjectIds(ctx);
    return this.repo.list(query, {
      userId: currentUserId(ctx),
      accessibleProjectIds,
      canManage: canManageAll
    });
  }

  async getById(id: string, ctx: RequestContext): Promise<RdTaskSheetDetail> {
    await this.requireEntityWithAccess(id, ctx);
    return this.requireDetail(id);
  }

  async previewImport(input: PreviewRdTaskSheetImportInput, ctx: RequestContext): Promise<PreviewRdTaskSheetImportResult> {
    this.requireAnyPermission(ctx, [SUBMIT_PERMISSION, MANAGE_PERMISSION]);
    const upload = await this.uploadQuery.getById(input.uploadId, ctx);
    if (!isDocxUpload(upload.fileName, upload.originalName, upload.mimeType)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "历史任务单导入仅支持 .docx 文件", 400);
    }
    if (!fs.existsSync(upload.storagePath)) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "上传的 Word 文件不存在", 404);
    }
    const draft = parseRdTaskSheetWord(fs.readFileSync(upload.storagePath));
    if (draft.projectId) {
      await this.resolveProjectId(draft.projectId, ctx, "import rd task sheet");
    }
    return {
      draft,
      upload: {
        uploadId: upload.id,
        originalName: upload.originalName || upload.fileName
      }
    };
  }

  async exportWord(id: string, ctx: RequestContext): Promise<RenderedRdTaskSheetWord> {
    await this.requireEntityWithAccess(id, ctx);
    return renderRdTaskSheetWord(this.requireDetail(id));
  }

  async convertToRdItem(id: string, input: ConvertRdTaskSheetToRdItemInput, ctx: RequestContext): Promise<RdTaskSheetDetail> {
    const current = await this.requireEntityWithAccess(id, ctx);
    if (!this.rdCommand) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, "rd conversion is not configured", 500);
    }
    if (current.convertedRdItemId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "任务单已转为研发项", 409);
    }
    const projectId = normalizeNullable(input.projectId) || current.projectId;
    if (!projectId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "转研发项需要选择关联项目", 400);
    }
    const rdItem = await this.rdCommand.createItem(
      {
        projectId,
        title: input.title?.trim() || current.title,
        description: input.description?.trim() || buildConvertedDescription(current),
        type: (input.type as RdItemType | undefined) ?? "feature_dev",
        priority: (input.priority as RdItemPriority | undefined) ?? (current.urgency === "urgent" ? "high" : "medium"),
        memberIds: input.memberIds?.map((item) => item.trim()).filter(Boolean) ?? defaultMemberIds(current),
        verifierId: normalizeNullable(input.verifierId),
        planStartAt: normalizeNullable(input.planStartAt) ?? current.issueDate,
        planEndAt: normalizeNullable(input.planEndAt) ?? current.expectedResolvedAt ?? undefined
      },
      ctx
    );
    const now = nowIso();
    this.repo.update(id, { converted_rd_item_id: rdItem.id, updated_at: now });
    this.createLog(id, "convert.rd_item", ctx, `转为研发项 ${rdItem.rdNo}`, now, { rdItemId: rdItem.id });
    return this.requireDetail(id);
  }

  async convertToIssue(id: string, input: ConvertRdTaskSheetToIssueInput, ctx: RequestContext): Promise<RdTaskSheetDetail> {
    const current = await this.requireEntityWithAccess(id, ctx);
    if (!this.issueCommand) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, "issue conversion is not configured", 500);
    }
    if (current.convertedIssueId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "任务单已转为测试单", 409);
    }
    const projectId = normalizeNullable(input.projectId) || current.projectId;
    if (!projectId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "转测试单需要选择关联项目", 400);
    }
    const issue = await this.issueCommand.create(
      {
        projectId,
        title: input.title?.trim() || current.title,
        description: input.description?.trim() || buildConvertedDescription(current),
        type: (input.type as IssueType | undefined) ?? "bug",
        priority: (input.priority as IssuePriority | undefined) ?? (current.urgency === "urgent" ? "high" : "medium"),
        assigneeId: normalizeNullable(input.assigneeId) ?? current.receiverUserId ?? current.processorUserId,
        verifierId: normalizeNullable(input.verifierId),
        rdItemId: normalizeNullable(input.rdItemId) ?? current.convertedRdItemId
      },
      ctx
    );
    const now = nowIso();
    this.repo.update(id, { converted_issue_id: issue.id, updated_at: now });
    this.createLog(id, "convert.issue", ctx, `转为测试单 ${issue.issueNo}`, now, { issueId: issue.id });
    return this.requireDetail(id);
  }

  async getEntityById(id: string, ctx: RequestContext): Promise<RdTaskSheetEntity> {
    return this.requireEntityWithAccess(id, ctx);
  }

  async listDefaultRoutes(query: ListRdTaskSheetDefaultRoutesQuery, ctx: RequestContext): Promise<RdTaskSheetDefaultRouteEntity[]> {
    this.requireAnyPermission(ctx, [MANAGE_PERMISSION]);
    return this.repo.listDefaultRoutes(query);
  }

  async getMyDefaultRoute(ctx: RequestContext): Promise<RdTaskSheetDefaultRouteEntity | null> {
    this.requireAnyPermission(ctx, [SUBMIT_PERMISSION, MANAGE_PERMISSION]);
    return this.findActiveDefaultRouteForUser(currentUserId(ctx));
  }

  async matchDefaultRoute(issuerUserId: string | undefined, ctx: RequestContext): Promise<RdTaskSheetDefaultRouteEntity | null> {
    this.requireAnyPermission(ctx, [SUBMIT_PERMISSION, MANAGE_PERMISSION]);
    const userId = normalizeNullable(issuerUserId) || currentUserId(ctx);
    return this.findActiveDefaultRouteForUser(userId);
  }

  async createDefaultRoute(input: CreateRdTaskSheetDefaultRouteInput, ctx: RequestContext): Promise<RdTaskSheetDefaultRouteEntity> {
    this.requireAnyPermission(ctx, [MANAGE_PERMISSION]);
    const actor = this.requireCurrentUser(ctx);
    const issuer = this.resolveOptionalUser(input.issuerUserId);
    const receiver = this.resolveOptionalUser(input.receiverUserId);
    const now = nowIso();
    const entity: RdTaskSheetDefaultRouteEntity = {
      id: genId("rdtsr"),
      issuerUserId: issuer?.id ?? normalizeNullable(input.issuerUserId),
      issuerName: normalizeNullable(input.issuerName) || userDisplayName(issuer),
      issuerDepartment: normalizeNullable(input.issuerDepartment),
      receiverUserId: receiver?.id ?? normalizeNullable(input.receiverUserId),
      receiverName: normalizeNullable(input.receiverName) || userDisplayName(receiver),
      receiverDepartment: normalizeNullable(input.receiverDepartment),
      receiverPhone: normalizeNullable(input.receiverPhone),
      status: input.status ?? "active",
      remark: normalizeNullable(input.remark),
      sort: input.sort ?? 0,
      createdByUserId: actor.id,
      updatedByUserId: actor.id,
      createdAt: now,
      updatedAt: now
    };
    this.repo.createDefaultRoute(entity);
    return entity;
  }

  async updateDefaultRoute(id: string, input: UpdateRdTaskSheetDefaultRouteInput, ctx: RequestContext): Promise<RdTaskSheetDefaultRouteEntity> {
    this.requireAnyPermission(ctx, [MANAGE_PERMISSION]);
    const current = this.repo.findDefaultRouteById(id);
    if (!current) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "rd task sheet default route not found", 404);
    }
    const actor = this.requireCurrentUser(ctx);
    const issuer = input.issuerUserId === undefined ? null : this.resolveOptionalUser(input.issuerUserId);
    const receiver = input.receiverUserId === undefined ? null : this.resolveOptionalUser(input.receiverUserId);
    const now = nowIso();
    const updated = this.repo.updateDefaultRoute(id, {
      issuer_user_id: input.issuerUserId === undefined ? current.issuerUserId : issuer?.id ?? normalizeNullable(input.issuerUserId),
      issuer_name:
        input.issuerName === undefined && input.issuerUserId === undefined
          ? current.issuerName
          : normalizeNullable(input.issuerName) || userDisplayName(issuer),
      issuer_department: input.issuerDepartment === undefined ? current.issuerDepartment : normalizeNullable(input.issuerDepartment),
      receiver_user_id: input.receiverUserId === undefined ? current.receiverUserId : receiver?.id ?? normalizeNullable(input.receiverUserId),
      receiver_name:
        input.receiverName === undefined && input.receiverUserId === undefined
          ? current.receiverName
          : normalizeNullable(input.receiverName) || userDisplayName(receiver),
      receiver_department: input.receiverDepartment === undefined ? current.receiverDepartment : normalizeNullable(input.receiverDepartment),
      receiver_phone: input.receiverPhone === undefined ? current.receiverPhone : normalizeNullable(input.receiverPhone),
      status: input.status ?? current.status,
      remark: input.remark === undefined ? current.remark : normalizeNullable(input.remark),
      sort: input.sort ?? current.sort,
      updated_by_user_id: actor.id,
      updated_at: now
    });
    if (!updated) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, "failed to update rd task sheet default route", 500);
    }
    return this.repo.findDefaultRouteById(id)!;
  }

  async deleteDefaultRoute(id: string, ctx: RequestContext): Promise<{ id: string }> {
    this.requireAnyPermission(ctx, [MANAGE_PERMISSION]);
    const deleted = this.repo.deleteDefaultRoute(id);
    if (!deleted) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "rd task sheet default route not found", 404);
    }
    return { id };
  }

  private async requireEntityWithAccess(id: string, ctx: RequestContext): Promise<RdTaskSheetEntity> {
    this.requireAnyPermission(ctx, [VIEW_SELF_PERMISSION, MANAGE_PERMISSION]);
    const entity = this.repo.findById(id);
    if (!entity) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "rd task sheet not found", 404);
    }
    if (this.isManager(ctx) || this.isRelatedUser(entity, currentUserId(ctx))) {
      return entity;
    }
    if (entity.projectId) {
      await this.projectAccess.requireProjectAccess(entity.projectId, ctx, "get rd task sheet");
      return entity;
    }
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "get task sheet forbidden", 403);
  }

  private requireDetail(id: string): RdTaskSheetDetail {
    const detail = this.repo.getDetail(id);
    if (!detail) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "rd task sheet not found", 404);
    }
    return detail;
  }

  private async resolveProjectId(projectId: string | null | undefined, ctx: RequestContext, action: string): Promise<string | null> {
    const normalized = normalizeNullable(projectId);
    if (!normalized) {
      return null;
    }
    await this.projectAccess.requireProjectAccess(normalized, ctx, action);
    return normalized;
  }

  private resolveOptionalUser(userId: string | null | undefined): UserDisplayProfile | null {
    const normalized = normalizeNullable(userId);
    if (!normalized) {
      return null;
    }
    return this.repo.findUserProfile(normalized);
  }

  private findActiveDefaultRouteForUser(userId: string): RdTaskSheetDefaultRouteEntity | null {
    if (!userId) {
      return null;
    }
    return this.repo.findActiveDefaultRouteForIssuer(userId);
  }

  private requireCurrentUser(ctx: RequestContext): { id: string; name: string } {
    const id = currentUserId(ctx);
    if (!id) {
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "user is required", 401);
    }
    return {
      id,
      name: ctx.nickname?.trim() || id
    };
  }

  private requireEditAccess(entity: RdTaskSheetEntity, ctx: RequestContext): void {
    if (this.isManager(ctx)) {
      return;
    }
    if (entity.status !== "draft") {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "only draft task sheets can be edited", 403);
    }
    if (entity.creatorId !== currentUserId(ctx) && entity.issuerUserId !== currentUserId(ctx)) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "edit task sheet forbidden", 403);
    }
  }

  private requireMutableAccess(entity: RdTaskSheetEntity, ctx: RequestContext, action: string): void {
    if (entity.status === "closed" && !this.isManager(ctx)) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, `${action} forbidden: task sheet is closed`, 403);
    }
    if (this.isManager(ctx) || this.isRelatedUser(entity, currentUserId(ctx))) {
      return;
    }
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, `${action} forbidden`, 403);
  }

  private requireHandlerAccess(entity: RdTaskSheetEntity, ctx: RequestContext, action: string): void {
    if (this.isManager(ctx)) {
      return;
    }
    const userId = currentUserId(ctx);
    if (userId && (entity.receiverUserId === userId || entity.processorUserId === userId || entity.creatorId === userId)) {
      return;
    }
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, `${action} forbidden`, 403);
  }

  private requireStatus(entity: RdTaskSheetEntity, allowed: RdTaskSheetEntity["status"][], action: string): void {
    if (!allowed.includes(entity.status)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, `${action} invalid from ${entity.status}`, 400);
    }
  }

  private requireAnyPermission(ctx: RequestContext, codes: string[]): void {
    if (!codes.some((code) => hasPermission(ctx, code))) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "forbidden", 403);
    }
  }

  private isManager(ctx: RequestContext): boolean {
    return hasPermission(ctx, MANAGE_PERMISSION);
  }

  private isRelatedUser(entity: RdTaskSheetEntity, userId: string): boolean {
    return Boolean(
      userId &&
        (entity.creatorId === userId ||
          entity.issuerUserId === userId ||
          entity.receiverUserId === userId ||
          entity.processorUserId === userId)
    );
  }

  private getNextSheetNo(): string {
    const prefix = nowIso().slice(0, 7).replace(/-/g, "");
    const sequence = this.repo.nextSheetSequence(prefix);
    return `${prefix}${String(sequence).padStart(4, "0")}`;
  }

  private ensureSheetNoUnique(sheetNo: string, excludeId?: string): void {
    if (this.repo.existsSheetNo(sheetNo, excludeId)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "任务单编号已存在", 409);
    }
  }

  private addAttachmentRecord(sheetId: string, uploadId: string, userId: string, createdAt: string): void {
    this.repo.addAttachment({
      id: genId("rdtsa"),
      sheetId,
      uploadId,
      fileName: null,
      originalName: null,
      mimeType: null,
      fileSize: null,
      createdByUserId: userId,
      createdAt
    });
  }

  private createLog(
    sheetId: string,
    action: RdTaskSheetAction,
    ctx: RequestContext,
    comment: string | null,
    createdAt: string,
    meta?: Record<string, unknown>
  ): void {
    this.repo.createLog({
      id: genId("rdtsl"),
      sheetId,
      action,
      actorUserId: currentUserId(ctx) || null,
      actorName: ctx.nickname?.trim() || currentUserId(ctx) || null,
      comment,
      metaJson: meta ? JSON.stringify(meta) : null,
      createdAt
    });
  }
}

function currentUserId(ctx: RequestContext): string {
  return ctx.userId?.trim() || ctx.accountId?.trim() || "";
}

function hasPermission(ctx: RequestContext, code: string): boolean {
  return new Set(ctx.authScopes ?? []).has(code);
}

function normalizeNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function userDisplayName(profile: UserDisplayProfile | null): string | null {
  if (!profile) {
    return null;
  }
  return profile.displayName?.trim() || profile.username;
}

function isDocxUpload(fileName: string, originalName: string | null | undefined, mimeType: string | null | undefined): boolean {
  const name = `${fileName || ""} ${originalName || ""}`.toLowerCase();
  return name.includes(".docx") || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function defaultMemberIds(entity: RdTaskSheetEntity): string[] {
  return Array.from(new Set([entity.receiverUserId, entity.processorUserId, entity.creatorId].filter(Boolean) as string[]));
}

function buildConvertedDescription(entity: RdTaskSheetEntity): string {
  return [
    `来源任务单：${entity.sheetNo}`,
    entity.projectName ? `项目名称：${entity.projectName}` : "",
    entity.customerCompany ? `客户单位：${entity.customerCompany}` : "",
    entity.expectedResolvedAt ? `期望解决时间：${entity.expectedResolvedAt}` : "",
    "",
    "业务描述：",
    entity.businessDescription,
    entity.deliveryContent ? `\n交付 / 答复内容：\n${entity.deliveryContent}` : ""
  ]
    .filter((line) => line !== "")
    .join("\n");
}
