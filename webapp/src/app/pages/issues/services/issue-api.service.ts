import { inject, Injectable } from '@angular/core';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { get } from 'lodash';
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

  assignIssue(projectId: string, issueId: string, input: AssignIssueInput) {
    return this.issueTokenApi.issuePostReqWithPK<IssueEntity>({
      issueId,
      action: 'assign',
      payload: input,
    });
  }

  claimIssue(projectId: string, issueId: string) {
    return this.issueTokenApi.issuePostReqWithPK<IssueEntity>({
      issueId,
      action: 'claim',
      payload: {},
    });
  }

  startIssue(projectId: string, issueId: string) {
    return this.issueTokenApi.issuePostReqWithPK<IssueEntity>({
      issueId,
      action: 'start',
      payload: {},
    });
  }

  resolveIssue(projectId: string, issueId: string, summary?: string) {
    return this.issueTokenApi.issuePostReqWithPK<IssueEntity>({
      issueId,
      action: 'resolve',
      payload: {},
    });
  }

  completeIssue(projectId: string, issueId: string) {
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

  reopenIssue(projectId: string, issueId: string) {
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

  getIssueComments(projectId: string, issueId: string) {
    return this.apiClient.hubRequestWithPrjId<{ items: IssueCommentEntity[] }>({
      projectId,
      path: `/issues/${issueId}/comments`,
    });
  }

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
