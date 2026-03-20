import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import type { EventBus } from "../../../shared/event/event-bus";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import type { UploadQueryContract } from "../../upload/upload.contract";
import type { ProjectAccessContract } from "../../project/project-access.contract";
import { IssueRepo } from "../issue.repo";
import type { IssueLogEntity } from "../issue.types";
import type { IssueAttachmentCommandContract, IssueAttachmentQueryContract } from "./issue-attachment.contract";
import { IssueAttachmentRepo } from "./issue-attachment.repo";
import type { CreateIssueAttachmentInput, IssueAttachmentEntity } from "./issue-attachment.types";

export class IssueAttachmentService implements IssueAttachmentCommandContract, IssueAttachmentQueryContract {
  constructor(
    private readonly issueRepo: IssueRepo,
    private readonly attachmentRepo: IssueAttachmentRepo,
    private readonly uploadQuery: UploadQueryContract,
    private readonly projectAccess: ProjectAccessContract,
    private readonly eventBus: EventBus
  ) {}

  async create(
    issueId: string,
    input: CreateIssueAttachmentInput,
    ctx: RequestContext
  ): Promise<IssueAttachmentEntity> {
    const issue = await this.requireIssueWithAccess(issueId, ctx, "create issue attachment");
    const upload = await this.uploadQuery.getById(input.uploadId.trim(), ctx);

    if (this.attachmentRepo.exists(issue.id, upload.id)) {
      throw new AppError("ISSUE_ATTACHMENT_EXISTS", "attachment already exists", 409);
    }

    const record = {
      id: genId("isa"),
      issueId: issue.id,
      uploadId: upload.id,
      createdAt: nowIso()
    };

    this.attachmentRepo.create(record);
    this.issueRepo.createLog(this.createAttachmentLog(issue.id, ctx, upload.originalName, "attachment.added"));
    await this.eventBus.emit({
      type: "issue.updated",
      scope: "project",
      projectId: issue.projectId,
      entityType: "issue",
      entityId: issue.id,
      action: "attachment.added",
      actorId: ctx.accountId,
      occurredAt: record.createdAt,
      payload: {
        issueNo: issue.issueNo,
        uploadId: upload.id,
        fileName: upload.originalName
      }
    });

    return {
      id: record.id,
      issueId: record.issueId,
      uploadId: record.uploadId,
      createdAt: record.createdAt,
      upload
    };
  }

  async list(issueId: string, ctx: RequestContext): Promise<IssueAttachmentEntity[]> {
    await this.requireIssueWithAccess(issueId, ctx, "list issue attachments");
    const records = this.attachmentRepo.listByIssueId(issueId);
    const items = await Promise.all(
      records.map(async (record) => ({
        id: record.id,
        issueId: record.issueId,
        uploadId: record.uploadId,
        createdAt: record.createdAt,
        upload: await this.uploadQuery.getById(record.uploadId, ctx)
      }))
    );
    return items;
  }

  async remove(issueId: string, attachmentId: string, ctx: RequestContext): Promise<{ ok: true }> {
    const issue = await this.requireIssueWithAccess(issueId, ctx, "remove issue attachment");
    const record = this.attachmentRepo.findById(issue.id, attachmentId);
    if (!record) {
      throw new AppError("ISSUE_ATTACHMENT_NOT_FOUND", `attachment not found: ${attachmentId}`, 404);
    }

    const upload = await this.uploadQuery.getById(record.uploadId, ctx);
    const deleted = this.attachmentRepo.delete(issue.id, attachmentId);
    if (!deleted) {
      throw new AppError("ISSUE_ATTACHMENT_DELETE_FAILED", "failed to delete attachment", 500);
    }

    const now = nowIso();
    this.issueRepo.createLog(this.createAttachmentLog(issue.id, ctx, upload.originalName, "attachment.removed", now));
    await this.eventBus.emit({
      type: "issue.updated",
      scope: "project",
      projectId: issue.projectId,
      entityType: "issue",
      entityId: issue.id,
      action: "attachment.removed",
      actorId: ctx.accountId,
      occurredAt: now,
      payload: {
        issueNo: issue.issueNo,
        uploadId: upload.id,
        fileName: upload.originalName
      }
    });

    return { ok: true };
  }

  private requireIssue(issueId: string) {
    const issue = this.issueRepo.findById(issueId);
    if (!issue) {
      throw new AppError("ISSUE_NOT_FOUND", `issue not found: ${issueId}`, 404);
    }
    return issue;
  }

  private async requireIssueWithAccess(issueId: string, ctx: RequestContext, action: string) {
    const issue = this.requireIssue(issueId);
    await this.projectAccess.requireProjectAccess(issue.projectId, ctx, action);
    return issue;
  }

  private createAttachmentLog(
    issueId: string,
    ctx: RequestContext,
    fileName: string,
    kind: "attachment.added" | "attachment.removed",
    createdAt = nowIso()
  ): IssueLogEntity {
    return {
      id: genId("islog"),
      issueId,
      actionType: "update",
      fromStatus: null,
      toStatus: null,
      operatorId: ctx.userId?.trim() || ctx.accountId,
      operatorName: ctx.userId?.trim() || ctx.accountId,
      summary: `${kind === "attachment.added" ? "attached" : "removed"} ${fileName}`,
      metaJson: JSON.stringify({ kind, fileName }),
      createdAt
    };
  }
}
