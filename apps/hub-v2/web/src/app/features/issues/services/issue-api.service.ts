import { inject, Injectable } from '@angular/core';

import { ApiClientService } from '../../../core/http/api-client.service';
import type {
  AssignIssueInput,
  CreateIssueInput,
  IssueAttachmentEntity,
  IssueCommentEntity,
  IssueEntity,
  IssueListQuery,
  IssueListResult,
  IssueLogEntity,
  IssueParticipantEntity,
  UploadEntity,
} from '../models/issue.model';

@Injectable({ providedIn: 'root' })
export class IssueApiService {
  private readonly api = inject(ApiClientService);

  list(query: Partial<IssueListQuery>) {
    return this.api.get<IssueListResult>('/issues', query);
  }

  create(input: CreateIssueInput) {
    return this.api.post<IssueEntity, CreateIssueInput>('/issues', input);
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

  createComment(issueId: string, content: string, mentions: string[] = []) {
    return this.api.post<IssueCommentEntity, { content: string; mentions?: string[] }>(`/issues/${issueId}/comments`, {
      content,
      mentions: mentions.length > 0 ? mentions : undefined,
    });
  }

  listParticipants(issueId: string) {
    return this.api.get<{ items: IssueParticipantEntity[] }>(`/issues/${issueId}/participants`);
  }

  addParticipant(issueId: string, userId: string) {
    return this.api.post<IssueParticipantEntity, { userId: string }>(`/issues/${issueId}/participants`, { userId });
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

  uploadFile(file: File) {
    const formData = new FormData();
    formData.set('file', file);
    formData.set('bucket', 'issues');
    formData.set('category', 'attachment');
    formData.set('visibility', 'private');
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
}
