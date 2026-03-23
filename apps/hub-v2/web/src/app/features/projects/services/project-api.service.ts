import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { ApiClientService } from '../../../core/http/api-client.service';
import type { PageResult } from '../../../core/types/page.types';
import type { AddProjectMemberInput, CreateProjectInput, ProjectListQuery, ProjectMemberEntity, ProjectSummary } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectApiService {
  private readonly api = inject(ApiClientService);

  list(query: Partial<ProjectListQuery>) {
    return this.api.get<PageResult<ProjectSummary>>('/projects', query);
  }

  listAccessible() {
    return this.api.get<PageResult<ProjectSummary>>('/projects').pipe(map((response) => response.items));
  }

  create(input: CreateProjectInput) {
    return this.api.post<ProjectSummary, CreateProjectInput>('/projects', input);
  }

  listMembers(projectId: string) {
    return this.api
      .get<{ items: ProjectMemberEntity[] }>(`/projects/${projectId}/members`)
      .pipe(map((response) => response.items));
  }

  addMember(projectId: string, input: AddProjectMemberInput) {
    return this.api.post<ProjectMemberEntity, AddProjectMemberInput>(`/projects/${projectId}/members`, input);
  }

  removeMember(projectId: string, memberId: string) {
    return this.api.delete<{ id: string }>(`/projects/${projectId}/members/${memberId}`);
  }
}
