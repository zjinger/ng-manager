import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@core/api';
import { lastValueFrom, Observable } from 'rxjs';
import { FsExplorerApiService } from '../components/fs-explorer';
import { CreateProjectDraft } from '../models/project-draft';
import { ProjectMemberEntity } from '@models/project.model';
import type {
  CheckProjectRootRequestDto,
  CreateProjectRequestDto,
  DetectProjectRequestDto,
  EditProjectRequestDto,
  ImportProjectRequestDto,
  OpenProjectInEditorRequestDto,
  ProjectAssetsDto,
  ProjectCheckRootResponseDto,
  ProjectDetectResponseDto,
  ProjectDetailResponseDto,
  ProjectIdResponseDto,
  ProjectImportCheckResponseDto,
  ProjectListResponseDto,
  ProjectMutationResponseDto,
  SetProjectFavoriteRequestDto,
  SetProjectLastOpenedRequestDto,
  UpdateProjectAssetsRequestDto,
  UpdateProjectRequestDto,
} from '@yinuo-ngm/protocol';
@Injectable({ providedIn: 'root' })
export class ProjectApiService {
  api = inject(ApiClient);
  fs = inject(FsExplorerApiService);

  // 调用本地服务检查路径是否存在 & 是否重复注册
  async checkPathExists(path: string): Promise<boolean> {
    return await lastValueFrom(this.fs.pathExists(path));
  }

  detect(rootPath: string): Observable<ProjectDetectResponseDto> {
    const body: DetectProjectRequestDto = { rootPath };
    return this.api.post<ProjectDetectResponseDto>('/api/projects/detect', body);
  }

  // Electron 里建议通过 preload 暴露 window.ngm.pickFolder()
  async pickFolder(): Promise<string | null> {
    return null;
  }

  bootstrapByCli(draft: CreateProjectDraft): Observable<{ taskId: string; rootPath: string }> {
    return this.api.post('/api/projects/bootstrap/cli', {
      parentDir: draft.parentDir,
      name: draft.name,
      rootPath: draft.rootPath,
      packageManager: draft.packageManager,
      overwriteIfExists: draft.overwriteIfExists,
      skipOnboarding: draft.skipOnboarding,
      initGit: draft.initGit,
      initialCommitMessage: draft.initialCommitMessage,
      cliFramework: draft.cliFramework,
      cliTool: draft.cliTool,
      cliArgs: draft.cliArgs ?? [],
    });
  }

  bootstrapPickRoot(input: { taskId: string; pickedRoot: string }) {
    return this.api.post<{ projectId: string; rootPath: string }>(
      '/api/projects/bootstrap/pickRoot',
      input,
    );
  }

  bootstrapByGit(draft: CreateProjectDraft): Observable<{ taskId: string; rootPath: string }> {
    return this.api.post('/api/projects/bootstrap/git', {
      repoUrl: draft.repoUrl,
      parentDir: draft.parentDir,
      name: draft.name,
      rootPath: draft.rootPath,
      overwriteIfExists: draft.overwriteIfExists,
      initGit: draft.initGit,
      initialCommitMessage: draft.initialCommitMessage,
      packageManager: draft.packageManager,
      skipOnboarding: draft.skipOnboarding ?? true,
    });
  }

  // 从hub-v2中获取项目成员
  getProjectMembers(projectId: string) {
    return this.api.hubRequestWithPrjId<{ items: ProjectMemberEntity[] }>({
      projectId: projectId,
      path: '/members',
    });
  }

  list() {
    return this.api.get<ProjectListResponseDto>('/api/projects/list');
  }

  get(id: string) {
    return this.api.get<ProjectDetailResponseDto>(`/api/projects/getInfo/${id}`);
  }

  check(rootPath: string) {
    const body: CheckProjectRootRequestDto = { rootPath };
    return this.api.post<ProjectCheckRootResponseDto>('/api/projects/check', body);
  }

  createByPath(data: { root: string; name: string; syncTasks?: boolean }) {
    const body: CreateProjectRequestDto = data;
    return this.api.post<ProjectIdResponseDto>('/api/projects/create', body);
  }

  checkImport(root: string) {
    return this.api.post<ProjectImportCheckResponseDto>('/api/projects/checkImport', { root });
  }

  importByPath(data: { root: string; name?: string; syncTasks?: boolean }) {
    const body: ImportProjectRequestDto = data;
    return this.api.post<ProjectIdResponseDto>('/api/projects/import', body);
  }

  delete(id: string) {
    return this.api.delete<ProjectIdResponseDto>(`/api/projects/delete/${id}`);
  }

  update(id: string, data: UpdateProjectRequestDto) {
    return this.api.post<ProjectMutationResponseDto>(`/api/projects/update/${id}`, data);
  }

  setFavorite(id: string, isFavorite: boolean) {
    const body: SetProjectFavoriteRequestDto = { isFavorite };
    return this.api.post<ProjectMutationResponseDto>(`/api/projects/favorite/${id}`, body);
  }

  toggleFavorite(id: string) {
    return this.api.post<ProjectMutationResponseDto>(`/api/projects/favorite/${id}/toggle`, {});
  }

  setLastOpened(id: string, timestamp: number) {
    const body: SetProjectLastOpenedRequestDto = { timestamp };
    return this.api.post<ProjectMutationResponseDto>(`/api/projects/lastOpened/${id}`, body);
  }

  openInEditor(id: string, editor: 'code' | 'system' = 'code') {
    const body: OpenProjectInEditorRequestDto = { editor };
    return this.api.post<void>(`/api/projects/openInEditor/${id}`, body);
  }

  edit(
    projectId: string,
    data: { name: string; description?: string; repoPageUrl?: string },
  ): Observable<ProjectMutationResponseDto> {
    const body: EditProjectRequestDto = data;
    return this.api.post<ProjectMutationResponseDto>(`/api/projects/edit/${projectId}`, body);
  }

  updateAssets(projectId: string, assets: ProjectAssetsDto): Observable<ProjectMutationResponseDto> {
    const body: UpdateProjectAssetsRequestDto = { assets };
    return this.api.post<ProjectMutationResponseDto>(`/api/projects/updateAssets/${projectId}`, body);
  }
}
