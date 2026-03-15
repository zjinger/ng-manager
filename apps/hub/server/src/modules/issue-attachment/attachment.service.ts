import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../env';
import { AppError } from '../../utils/app-error';
import { genId } from '../../utils/id';
import { nowIso } from '../../utils/time';
import { IssuePermissionService } from '../issue/issue.permission';
import { IssueRepo } from '../issue/issue.repo';
import { IssueLogService } from '../issue-log/issue-log.service';
import { UploadService } from '../upload/upload.service';
import { IssueAttachmentRepo } from './attachment.repo';
import type { CreateIssueAttachmentInput, IssueAttachmentEntity, RemoveIssueAttachmentInput } from './attachment.types';

export class IssueAttachmentService {
  constructor(
    private readonly issueRepo: IssueRepo,
    private readonly repo: IssueAttachmentRepo,
    private readonly uploadService: UploadService,
    private readonly permission: IssuePermissionService,
    private readonly logService: IssueLogService
  ) {}

  list(projectId: string, issueId: string): IssueAttachmentEntity[] {
    this.requireIssue(projectId, issueId);
    return this.repo.listByIssueId(issueId);
  }

  get(projectId: string, issueId: string, attachmentId: string): IssueAttachmentEntity {
    this.requireIssue(projectId, issueId);
    const attachment = this.repo.findById(issueId, attachmentId);
    if (!attachment) {
      throw new AppError('ISSUE_ATTACHMENT_NOT_FOUND', `attachment not found: ${attachmentId}`, 404);
    }
    if (attachment.storageProvider === 'local' && !fs.existsSync(attachment.storagePath)) {
      throw new AppError('ISSUE_ATTACHMENT_FILE_NOT_FOUND', `attachment file not found: ${attachmentId}`, 404);
    }
    return attachment;
  }

  create(input: CreateIssueAttachmentInput): IssueAttachmentEntity {
    const issue = this.requireIssue(input.projectId, input.issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, 'upload attachment');
    this.permission.assertCanUploadAttachment(issue, operatorId);

    const upload = this.uploadService.createLocalUpload({
      category: 'issue',
      originalName: input.originalName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      tempFilePath: input.tempFilePath,
      storageDir: path.join(env.uploadRoot, 'issues', issue.id),
      visibility: 'private',
      uploaderId: operatorId,
      uploaderName: input.operatorName?.trim() || null
    });

    const createdAt = nowIso();
    const entity = {
      id: genId('iat'),
      issueId: issue.id,
      uploadId: upload.id,
      createdAt
    };

    this.issueRepo.runInTransaction(() => {
      this.repo.create(entity);
      this.issueRepo.update(issue.projectId, issue.id, { updatedAt: createdAt });
      this.logService.record({
        issueId: issue.id,
        actionType: 'attachment_add',
        fromStatus: issue.status,
        toStatus: issue.status,
        operatorId,
        operatorName: input.operatorName?.trim() || null,
        summary: `Uploaded attachment ${upload.originalName}`
      });
    });

    return this.get(issue.projectId, issue.id, entity.id);
  }

  remove(input: RemoveIssueAttachmentInput): IssueAttachmentEntity[] {
    const issue = this.requireIssue(input.projectId, input.issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, 'delete attachment');
    if (issue.status === 'closed') {
      throw new AppError('ISSUE_ATTACHMENT_DELETE_FORBIDDEN', 'cannot delete attachments from a closed issue', 400);
    }

    const attachment = this.get(issue.projectId, issue.id, input.attachmentId);
    this.permission.assertCanDeleteAttachment(issue, operatorId, attachment.uploaderId);

    const upload = this.uploadService.getById(attachment.uploadId);
    const timestamp = nowIso();
    this.issueRepo.runInTransaction(() => {
      const deleted = this.repo.delete(issue.id, attachment.id);
      if (!deleted) {
        throw new AppError('ISSUE_ATTACHMENT_DELETE_FAILED', 'failed to delete attachment link', 500);
      }
      this.issueRepo.update(issue.projectId, issue.id, { updatedAt: timestamp });
      this.logService.record({
        issueId: issue.id,
        actionType: 'attachment_remove',
        fromStatus: issue.status,
        toStatus: issue.status,
        operatorId,
        operatorName: input.operatorName?.trim() || null,
        summary: `Removed attachment ${attachment.originalName}`
      });
    });
    this.uploadService.softDelete(upload.id);
    this.uploadService.deleteLocalFile(upload);

    return this.repo.listByIssueId(issue.id);
  }

  private requireIssue(projectId: string, issueId: string) {
    const issue = this.issueRepo.findById(projectId, issueId);
    if (!issue) {
      throw new AppError('ISSUE_NOT_FOUND', `issue not found: ${issueId}`, 404);
    }
    return issue;
  }
}
