import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@core/api';
import { CheckRootResult, DetectResult, ImportCheckResult, Project } from '@models/project.model';
import { lastValueFrom, Observable } from 'rxjs';
import { FsExplorerApiService } from '../components/fs-explorer';
import { CreateProjectDraft } from '../models/project-draft';
@Injectable({ providedIn: 'root' })
export class ProjectApiService {

  api = inject(ApiClient)
  fs = inject(FsExplorerApiService)

  // 调用本地服务检查路径是否存在 & 是否重复注册
  async checkPathExists(path: string): Promise<boolean> {
    return await lastValueFrom(this.fs.pathExists(path));
  }

  detect(rootPath: string): Observable<DetectResult> {
    return this.api.post<DetectResult>("/api/projects/detect", { rootPath });
  }

  // Electron 里建议通过 preload 暴露 window.ngm.pickFolder()
  async pickFolder(): Promise<string | null> {
    return null;
  }


  bootstrapByCli(draft: CreateProjectDraft): Observable<{ taskId: string; rootPath: string }> {
    return this.api.post("/api/projects/bootstrap/cli", {
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
    return this.api.post<{ ok: boolean; reason?: string; projectId?: string; rootPath?: string; }>("/api/projects/bootstrap/pickRoot", input);
  }


  bootstrapByGit(draft: CreateProjectDraft): Observable<{ taskId: string; rootPath: string }> {
    return this.api.post("/api/projects/bootstrap/git", {
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

  list() {
    return this.api.get<Project[]>("/api/projects/list");
  }

  get(id: string) {
    return this.api.get<Project>(`/api/projects/getInfo/${id}`);
  }

  check(rootPath: string) {
    return this.api.post<CheckRootResult>("/api/projects/check", { rootPath });
  }


  createByPath(data: { root: string; name: string; syncTasks?: boolean }) {
    return this.api.post<{ id: string }>("/api/projects/create", data);
  }

  checkImport(root: string) {
    return this.api.post<ImportCheckResult>("/api/projects/checkImport", { root });
  }

  importByPath(data: { root: string; name?: string; syncTasks?: boolean }) {
    return this.api.post<{ id: string }>("/api/projects/import", data);
  }

  delete(id: string) {
    return this.api.delete<{ id: string }>(`/api/projects/delete/${id}`);
  }

  update(id: string, data: Partial<Project>) {
    return this.api.post<Project>(`/api/projects/update/${id}`, data);
  }

  setFavorite(id: string, isFavorite: boolean) {
    return this.api.post<Project>(`/api/projects/favorite/${id}`, { isFavorite });
  }

  toggleFavorite(id: string) {
    return this.api.post<Project>(`/api/projects/favorite/${id}/toggle`, {});
  }

  setLastOpened(id: string, timestamp: number) {
    return this.api.post<Project>(`/api/projects/lastOpened/${id}`, { timestamp });
  }

  openInEditor(id: string, editor: "code" | "system" = "code") {
    return this.api.post<{ ok: boolean }>(`/api/projects/openInEditor/${id}`, { editor });
  }

  edit(projectId: string, data: { name: string, description?: string, repoPageUrl?: string }): Observable<Project> {
    return this.api.post<Project>(`/api/projects/edit/${projectId}`, data);
  }

}
