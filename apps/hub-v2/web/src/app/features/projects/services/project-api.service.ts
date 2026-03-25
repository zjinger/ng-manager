import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { ApiClientService } from '../../../core/http/api-client.service';
import type { PageResult } from '../../../core/types/page.types';
import type {
  AddProjectMemberInput,
  CreateProjectInput,
  CreateProjectMetaItemInput,
  CreateProjectVersionItemInput,
  ProjectListQuery,
  ProjectMemberCandidate,
  ProjectMemberEntity,
  ProjectMetaItem,
  ProjectSummary,
  ProjectVersionItem,
  UpdateProjectInput,
  UpdateProjectMetaItemInput,
  UpdateProjectVersionItemInput
} from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectApiService {
  private readonly api = inject(ApiClientService);

  uploadProjectAvatar(file: File) {
    const formData = new FormData();
    formData.set('file', file);
    formData.set('bucket', 'project-avatars');
    formData.set('category', 'project_avatar');
    formData.set('visibility', 'private');
    return this.api.post<{ id: string }, FormData>('/uploads', formData);
  }

  list(query: Partial<ProjectListQuery>) {
    return this.api.get<PageResult<ProjectSummary>>('/projects', query);
  }

  listAccessible() {
    return this.api.get<PageResult<ProjectSummary>>('/projects').pipe(map((response) => response.items));
  }

  create(input: CreateProjectInput) {
    return this.api.post<ProjectSummary, CreateProjectInput>('/projects', input);
  }

  update(projectId: string, input: UpdateProjectInput) {
    return this.api.patch<ProjectSummary, UpdateProjectInput>(`/projects/${projectId}`, input);
  }

  listMembers(projectId: string) {
    return this.api
      .get<{ items: ProjectMemberEntity[] }>(`/projects/${projectId}/members`)
      .pipe(map((response) => response.items));
  }

  listMemberCandidates(projectId: string) {
    return this.api
      .get<{ items: ProjectMemberCandidate[] }>(`/projects/${projectId}/member-candidates`)
      .pipe(map((response) => response.items));
  }

  addMember(projectId: string, input: AddProjectMemberInput) {
    return this.api.post<ProjectMemberEntity, AddProjectMemberInput>(`/projects/${projectId}/members`, input);
  }

  removeMember(projectId: string, memberId: string) {
    return this.api.delete<{ id: string }>(`/projects/${projectId}/members/${memberId}`);
  }

  listModules(projectId: string) {
    return this.api.get<{ items: ProjectMetaItem[] }>(`/projects/${projectId}/modules`).pipe(map((response) => response.items));
  }

  addModule(projectId: string, input: CreateProjectMetaItemInput) {
    return this.api.post<ProjectMetaItem, CreateProjectMetaItemInput>(`/projects/${projectId}/modules`, input);
  }

  updateModule(projectId: string, moduleId: string, input: UpdateProjectMetaItemInput) {
    return this.api.patch<ProjectMetaItem, UpdateProjectMetaItemInput>(`/projects/${projectId}/modules/${moduleId}`, input);
  }

  removeModule(projectId: string, moduleId: string) {
    return this.api.delete<{ id: string }>(`/projects/${projectId}/modules/${moduleId}`);
  }

  listEnvironments(projectId: string) {
    return this.api
      .get<{ items: ProjectMetaItem[] }>(`/projects/${projectId}/environments`)
      .pipe(map((response) => response.items));
  }

  addEnvironment(projectId: string, input: CreateProjectMetaItemInput) {
    return this.api.post<ProjectMetaItem, CreateProjectMetaItemInput>(`/projects/${projectId}/environments`, input);
  }

  updateEnvironment(projectId: string, environmentId: string, input: UpdateProjectMetaItemInput) {
    return this.api.patch<ProjectMetaItem, UpdateProjectMetaItemInput>(
      `/projects/${projectId}/environments/${environmentId}`,
      input
    );
  }

  removeEnvironment(projectId: string, environmentId: string) {
    return this.api.delete<{ id: string }>(`/projects/${projectId}/environments/${environmentId}`);
  }

  listVersions(projectId: string) {
    return this.api.get<{ items: ProjectVersionItem[] }>(`/projects/${projectId}/versions`).pipe(map((response) => response.items));
  }

  addVersion(projectId: string, input: CreateProjectVersionItemInput) {
    return this.api.post<ProjectVersionItem, CreateProjectVersionItemInput>(`/projects/${projectId}/versions`, input);
  }

  updateVersion(projectId: string, versionId: string, input: UpdateProjectVersionItemInput) {
    return this.api.patch<ProjectVersionItem, UpdateProjectVersionItemInput>(`/projects/${projectId}/versions/${versionId}`, input);
  }

  removeVersion(projectId: string, versionId: string) {
    return this.api.delete<{ id: string }>(`/projects/${projectId}/versions/${versionId}`);
  }
}
