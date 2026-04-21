import { inject, Injectable } from '@angular/core';

import { ApiClientService } from '@core/http';
import { buildUploadFormData, UPLOAD_TARGETS } from '@shared/constants';
import type {
  AssignIssueInput,
  CloseIssueInput,
  CreateIssueInput,
  CreateIssueBranchInput,
  CompleteIssueBranchInput,
  StartOwnIssueBranchInput,
  IssueAttachmentEntity,
  IssueBranchEntity,
  IssueCommentEntity,
  IssueEntity,
  IssueListQuery,
  IssueListResult,
  IssueLogEntity,
  IssueParticipantEntity,
  UpdateIssueInput,
  UploadEntity,
} from '../models/issue.model';

@Injectable({ providedIn: 'root' })
export class IssueApiService {
  private readonly api = inject(ApiClientService);

  list(query: Partial<IssueListQuery>) {
    const normalizedQuery: Record<string, string | number | boolean | null | undefined> = {
      ...query,
      status: query.status && query.status.length > 0 ? query.status.join(',') : undefined,
      types: query.types && query.types.length > 0 ? query.types.join(',') : undefined,
      priority: query.priority && query.priority.length > 0 ? query.priority.join(',') : undefined,
      reporterIds: query.reporterIds && query.reporterIds.length > 0 ? query.reporterIds.join(',') : undefined,
      assigneeIds: query.assigneeIds && query.assigneeIds.length > 0 ? query.assigneeIds.join(',') : undefined,
      moduleCodes: query.moduleCodes && query.moduleCodes.length > 0 ? query.moduleCodes.join(',') : undefined,
      versionCodes: query.versionCodes && query.versionCodes.length > 0 ? query.versionCodes.join(',') : undefined,
      environmentCodes: query.environmentCodes && query.environmentCodes.length > 0 ? query.environmentCodes.join(',') : undefined,
      includeAssigneeParticipants: query.includeAssigneeParticipants,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };
    return this.api.get<IssueListResult>('/issues', normalizedQuery);
  }

  create(input: CreateIssueInput) {
    return this.api.post<IssueEntity, CreateIssueInput>('/issues', input);
  }

  update(issueId: string, input: UpdateIssueInput) {
    return this.api.patch<IssueEntity, UpdateIssueInput>(`/issues/${issueId}`, input);
  }

  getById(issueId: string) {
    return this.api.get<IssueEntity>(`/issues/${issueId}`);
  }

  listLogs(issueId: string) {
    return this.api.get<{ items: IssueLogEntity[] }>(`/issues/${issueId}/logs`);
  }

  listComments(issueId: string) {
    return this.api.get<{ items: IssueCommentEntity[] }>(`/issues/${issueId}/comments`);
  }

  createComment(issueId: string, content: string, mentions: string[] = [], attachmentIds: string[] = []) {
    return this.api.post<IssueCommentEntity, { content: string; mentions?: string[]; attachmentIds?: string[] }>(
      `/issues/${issueId}/comments`,
      {
        content,
        mentions: mentions.length > 0 ? mentions : undefined,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      },
    );
  }

  listParticipants(issueId: string) {
    return this.api.get<{ items: IssueParticipantEntity[] }>(`/issues/${issueId}/participants`);
  }

  listBranches(issueId: string) {
    return this.api.get<{ items: IssueBranchEntity[] }>(`/issues/${issueId}/branches`);
  }

  createBranch(issueId: string, input: CreateIssueBranchInput) {
    return this.api.post<IssueBranchEntity, CreateIssueBranchInput>(`/issues/${issueId}/branches`, input);
  }

  startOwnBranch(issueId: string, input: StartOwnIssueBranchInput) {
    return this.api.post<IssueBranchEntity, StartOwnIssueBranchInput>(`/issues/${issueId}/branches/start-mine`, input);
  }

  startBranch(issueId: string, branchId: string) {
    return this.api.post<IssueBranchEntity>(`/issues/${issueId}/branches/${branchId}/start`);
  }

  completeBranch(issueId: string, branchId: string, input: CompleteIssueBranchInput = {}) {
    return this.api.post<IssueBranchEntity, CompleteIssueBranchInput>(`/issues/${issueId}/branches/${branchId}/complete`, input);
  }

  addParticipant(issueId: string, userId: string) {
    return this.api.post<IssueParticipantEntity, { userId: string }>(`/issues/${issueId}/participants`, { userId });
  }

  addParticipants(issueId: string, userIds: string[]) {
    return this.api.post<{ items: IssueParticipantEntity[] }, { userIds: string[] }>(`/issues/${issueId}/participants/batch`, {
      userIds,
    });
  }

  removeParticipant(issueId: string, participantId: string) {
    return this.api.delete<{ id: string }>(`/issues/${issueId}/participants/${participantId}`);
  }

  listAttachments(issueId: string) {
    return this.api.get<{ items: IssueAttachmentEntity[] }>(`/issues/${issueId}/attachments`);
  }

  addAttachment(issueId: string, uploadId: string) {
    return this.api.post<IssueAttachmentEntity, { uploadId: string }>(`/issues/${issueId}/attachments`, {
      uploadId,
    });
  }

  removeAttachment(issueId: string, attachmentId: string) {
    return this.api.delete<{ id: string }>(`/issues/${issueId}/attachments/${attachmentId}`);
  }

  uploadFile(file: File, issueId?: string) {
    const formData = buildUploadFormData(file, UPLOAD_TARGETS.issueAttachment, {
      entityType: issueId?.trim() ? 'issue' : null,
      entityId: issueId?.trim() || null,
    });
    return this.api.post<UploadEntity, FormData>('/uploads', formData);
  }

  assign(issueId: string, input: AssignIssueInput) {
    return this.api.post<IssueEntity, AssignIssueInput>(`/issues/${issueId}/assign`, input);
  }

  claim(issueId: string) {
    return this.api.post<IssueEntity>(`/issues/${issueId}/claim`);
  }

  start(issueId: string) {
    return this.api.post<IssueEntity>(`/issues/${issueId}/start`);
  }

  waitUpdate(issueId: string) {
    return this.api.post<IssueEntity>(`/issues/${issueId}/wait-update`);
  }

  urge(issueId: string) {
    return this.api.post<IssueEntity>(`/issues/${issueId}/urge`);
  }

  verify(issueId: string) {
    return this.api.post<IssueEntity>(`/issues/${issueId}/verify`);
  }

  resolve(issueId: string, resolutionSummary?: string) {
    return this.api.post<IssueEntity, { resolutionSummary?: string }>(`/issues/${issueId}/resolve`, {
      resolutionSummary,
    });
  }

  reopen(issueId: string, remark?: string) {
    return this.api.post<IssueEntity, { remark?: string }>(`/issues/${issueId}/reopen`, { remark });
  }

  close(issueId: string, input: CloseIssueInput = {}) {
    return this.api.post<IssueEntity, CloseIssueInput>(`/issues/${issueId}/close`, input);
  }
}
