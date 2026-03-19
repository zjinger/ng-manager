import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HubApiService } from '../../core/http/hub-api.service';
import type { ProjectConfigItem, ProjectMemberItem, ProjectVersionItem } from '../projects/projects.model';
import type {
  IssueActionPanelSubmit,
  IssueCommentMention,
  IssueDetailResult,
  IssueFormValue,
  IssueItem,
  IssueListResult,
  ProjectOption
} from './issues.model';

@Injectable({ providedIn: 'root' })
export class IssueManagementApiService {
  public constructor(private readonly api: HubApiService) {}

  public async listProjects(): Promise<ProjectOption[]> {
    const result = await firstValueFrom(
      this.api.get<{ items: ProjectOption[] }>('/api/admin/projects', {
        params: { page: 1, pageSize: 100, status: 'active' }
      })
    );
    return result.items;
  }

  public async listProjectMembers(projectId: string): Promise<ProjectMemberItem[]> {
    const result = await firstValueFrom(
      this.api.get<{ items: ProjectMemberItem[] }>(`/api/admin/projects/${projectId}/members`)
    );
    return result.items;
  }

  public async listProjectModules(projectId: string): Promise<ProjectConfigItem[]> {
    const result = await firstValueFrom(
      this.api.get<{ items: ProjectConfigItem[] }>(`/api/admin/projects/${projectId}/modules`)
    );
    return result.items.filter((item) => item.enabled);
  }

  public async listProjectEnvironments(projectId: string): Promise<ProjectConfigItem[]> {
    const result = await firstValueFrom(
      this.api.get<{ items: ProjectConfigItem[] }>(`/api/admin/projects/${projectId}/environments`)
    );
    return result.items.filter((item) => item.enabled);
  }

  public async listProjectVersions(projectId: string): Promise<ProjectVersionItem[]> {
    const result = await firstValueFrom(
      this.api.get<{ items: ProjectVersionItem[] }>(`/api/admin/projects/${projectId}/versions`)
    );
    return result.items.filter((item) => item.enabled);
  }

  public async listIssues(projectId: string, params: Record<string, string | number>): Promise<IssueListResult> {
    return firstValueFrom(this.api.get<IssueListResult>(`/api/admin/projects/${projectId}/issues`, { params }));
  }

  public async listAllIssues(params: Record<string, string | number>): Promise<IssueListResult> {
    return firstValueFrom(this.api.get<IssueListResult>('/api/admin/issues', { params }));
  }

  public async listTodoIssues(params: Record<string, string | number>): Promise<IssueListResult> {
    return firstValueFrom(this.api.get<IssueListResult>('/api/admin/issues/todo', { params }));
  }

  public async getIssueDetail(projectId: string, issueId: string): Promise<IssueDetailResult> {
    return firstValueFrom(this.api.get<IssueDetailResult>(`/api/admin/projects/${projectId}/issues/${issueId}`));
  }

  public async createIssue(projectId: string, value: IssueFormValue): Promise<IssueItem> {
    return firstValueFrom(
      this.api.post<IssueItem, Record<string, string | null>>(`/api/admin/projects/${projectId}/issues`, {
        title: value.title,
        description: value.description,
        type: value.type,
        priority: value.priority,
        assigneeId: value.assigneeId || null,
        moduleCode: value.moduleCode || null,
        versionCode: value.versionCode || null,
        environmentCode: value.environmentCode || null
      })
    );
  }

  public async updateIssue(projectId: string, issueId: string, value: IssueFormValue): Promise<IssueItem> {
    return firstValueFrom(
      this.api.patch<IssueItem, Record<string, string | null>>(`/api/admin/projects/${projectId}/issues/${issueId}`, {
        title: value.title,
        description: value.description,
        type: value.type,
        priority: value.priority,
        assigneeId: value.assigneeId || null,
        moduleCode: value.moduleCode || null,
        versionCode: value.versionCode || null,
        environmentCode: value.environmentCode || null
      })
    );
  }

  public async runAction(projectId: string, issueId: string, payload: IssueActionPanelSubmit): Promise<void> {
    if (payload.action === 'assign') {
      await firstValueFrom(this.api.post(`/api/admin/projects/${projectId}/issues/${issueId}/assign`, { assigneeId: payload.assigneeId }));
      return;
    }
    if (payload.action === 'claim') {
      await firstValueFrom(this.api.post(`/api/admin/projects/${projectId}/issues/${issueId}/claim`, {}));
      return;
    }
    if (payload.action === 'reassign') {
      await firstValueFrom(this.api.post(`/api/admin/projects/${projectId}/issues/${issueId}/reassign`, { assigneeId: payload.assigneeId }));
      return;
    }
    if (payload.action === 'start') {
      await firstValueFrom(this.api.post(`/api/admin/projects/${projectId}/issues/${issueId}/start`, { comment: payload.comment }));
      return;
    }
    if (payload.action === 'resolve') {
      await firstValueFrom(this.api.post(`/api/admin/projects/${projectId}/issues/${issueId}/resolve`, { comment: payload.comment }));
      return;
    }
    if (payload.action === 'verify') {
      await firstValueFrom(this.api.post(`/api/admin/projects/${projectId}/issues/${issueId}/verify`, { comment: payload.comment }));
      return;
    }
    if (payload.action === 'reopen') {
      await firstValueFrom(this.api.post(`/api/admin/projects/${projectId}/issues/${issueId}/reopen`, { comment: payload.comment }));
      return;
    }
    await firstValueFrom(this.api.post(`/api/admin/projects/${projectId}/issues/${issueId}/close`, { closeReason: payload.closeReason }));
  }

  public async addParticipant(projectId: string, issueId: string, userId: string): Promise<void> {
    await firstValueFrom(this.api.post(`/api/admin/projects/${projectId}/issues/${issueId}/participants`, { userId }));
  }

  public async removeParticipant(projectId: string, issueId: string, userId: string): Promise<void> {
    await firstValueFrom(this.api.delete(`/api/admin/projects/${projectId}/issues/${issueId}/participants/${userId}`));
  }

  public async createComment(projectId: string, issueId: string, content: string, mentions: IssueCommentMention[] = []): Promise<void> {
    await firstValueFrom(this.api.post(`/api/admin/projects/${projectId}/issues/${issueId}/comments`, { content, mentions }));
  }

  public async uploadAttachments(projectId: string, issueId: string, files: File[]): Promise<void> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    await firstValueFrom(this.api.post(`/api/admin/projects/${projectId}/issues/${issueId}/attachments`, formData));
  }

  public async deleteAttachment(projectId: string, issueId: string, attachmentId: string): Promise<void> {
    await firstValueFrom(this.api.delete(`/api/admin/projects/${projectId}/issues/${issueId}/attachments/${attachmentId}`));
  }
}
