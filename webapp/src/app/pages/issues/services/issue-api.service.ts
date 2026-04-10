import { inject, Injectable } from '@angular/core';
import {
  CreateIssueInput,
  IssueEntity,
  IssueListQuery,
  IssuePriority,
  IssueType,
  IssueCommentEntity,
  AssignIssueInput,
  IssueLogEntity,
  IssueListResult,
  IssueParticipantEntity,
  IssueAttachmentEntity,
  ProjectMemberEntity,
  AddParticipantsInput,
} from '../models/issue.model';
import { ApiClient } from '@core/api/api-client';
import { IssueTokenApiService } from './issue-token-api.service';
@Injectable({
  providedIn: 'root',
})
export class IssueApiService {
  private readonly apiClient = inject(ApiClient);
  private readonly issueTokenApi = inject(IssueTokenApiService);

  async addAttachment(id: string, id1: any): Promise<any> {
    throw new Error('Method not implemented.');
  }

  uploadFile(file: File, id: string): Promise<any> {
    throw new Error('Method not implemented.');
  }

  addParticipant(issueId: string, input: { userId: string }) {
    return this.issueTokenApi.issuePostReqWithPK<IssueParticipantEntity>({
      issueId,
      action: 'participants',
      payload: input,
    });
  }

  // createIssue(input: CreateIssueInput) {
  //   return this.apiClient.hubTokenRequest({
  //     projectId: input.projectId,
  //     path: `/issues`,
  //     method: 'POST',
  //     payload: input,
  //   });
  // }

  addComment(issueId: string, content: string) {
    return this.issueTokenApi.issuePostReqWithPK({
      issueId,
      action: 'comments',
      payload: { content },
    });
  }

  assignIssue( issueId: string, input: AssignIssueInput) {
    return this.issueTokenApi.issuePostReqWithPK<IssueEntity>({
      issueId,
      action: 'assign',
      payload: input,
    });
  }

  claimIssue( issueId: string) {
    return this.issueTokenApi.issuePostReqWithPK<IssueEntity>({
      issueId,
      action: 'claim',
      payload: {},
    });
  }

  startIssue( issueId: string) {
    return this.issueTokenApi.issuePostReqWithPK<IssueEntity>({
      issueId,
      action: 'start',
      payload: {},
    });
  }

  waitUpdateIssue(issueId: string) {
    return this.issueTokenApi.issuePostReqWithPK<IssueEntity>({
      issueId,
      action: 'wait-update',
      payload: {},
    });
  }

  resolveIssue( issueId: string, summary?: string) {
    return this.issueTokenApi.issuePostReqWithPK<IssueEntity>({
      issueId,
      action: 'resolve',
      payload: {},
    });
  }

  // verifyIssue(projectId: string, issueId: string) {
  //   return this.issueTokenApi.issuePostReqWithPK<IssueEntity>({
  //     projectId,
  //     path: `/personal/projects/${projectId}/issues/${issueId}/verify`,
  //     method: 'POST',
  //   });
  // }

  reopenIssue( issueId: string) {
    return this.issueTokenApi.issuePostReqWithPK<IssueEntity>({
      issueId,
      action: 'reopen',
      payload: {},
    });
  }

  // closeIssue(projectId: string, issueId: string) {
  //   return this.apiClient.hubTokenRequest<IssueEntity>({
  //     projectId,
  //     path: `/personal/projects/${projectId}/issues/${issueId}/close`,
  //     method: 'POST',
  //   });
  // }

  getIssuesList(projectId: string, query: IssueListQuery) {
    return this.apiClient.hubRequestWithPrjId<IssueListResult>({
      projectId,
      path: `/issues`,
      query: { ...query },
    });
  }

  getIssueDetail(projectId: string, issueId: string) {
    return this.apiClient.hubRequestWithPrjId<IssueEntity>({
      projectId,
      path: `/issues/${issueId}`,
    });
  }

  getIssueLogs(projectId: string, issueId: string) {
    return this.apiClient.hubRequestWithPrjId<{ items: IssueLogEntity[] }>({
      projectId,
      path: `/issues/${issueId}/logs`,
    });
  }

  // getIssueComments(projectId: string, issueId: string) {
  //   return this.apiClient.hubRequestWithPrjId<{ items: IssueCommentEntity[] }>({
  //     projectId,
  //     path: `/issues/${issueId}/comments`,
  //   });
  // }

  getIssueParticipants(projectId: string, issueId: string) {
    return this.apiClient.hubRequestWithPrjId<{ items: IssueParticipantEntity[] }>({
      projectId,
      path: `/issues/${issueId}/participants`,
    });
  }

  getIssueAttachments(projectId: string, issueId: string) {
    return this.apiClient.hubRequestWithPrjId<{
      items: IssueAttachmentEntity[];
    }>({
      projectId,
      path: `/issues/${issueId}/attachments`,
    });
  }

  getProjectMembers(projectId: string) {
    return this.apiClient.hubRequestWithPrjId<{ items: ProjectMemberEntity[] }>({
      projectId,
      path: `/projects/${projectId}/members`,
    });
  }

  createIssueComment(issueId: string, content: string, mentions: string[] = []) {
    return this.issueTokenApi.issuePostReqWithPK<IssueCommentEntity>({
      issueId,
      action: 'comments',
      payload: { content, mentions },
    });
  }

  removeParticipant(issueId: string, participantId: string) {
    return this.issueTokenApi.issueDeleteReqWithPK<IssueParticipantEntity[]>({
      issueId,
      action: 'participants',
      deletedId: participantId,
    });
  }
}
