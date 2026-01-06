import { inject, Injectable } from '@angular/core';
import { CreateProjectDraft } from '../models/project-draft';
import { ApiClient } from '@app/core/api/api-client';
import { CheckRootResult, DetectResult, ImportCheckResult, Project } from '@models/project.model';
import { Observable } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class ProjectService {

  api = inject(ApiClient)

  async checkPathExists(_rootPath: string): Promise<boolean> {
    // TODO: 调用本地服务检查路径是否存在 & 是否重复注册
    return true;
  }

  detect(rootPath: string): Observable<DetectResult> {
    return this.api.post<DetectResult>("/api/projects/detect", { rootPath });
  }

  async createProject(_draft: CreateProjectDraft): Promise<{ projectId: string }> {
    // TODO: create project + import tasks
    return { projectId: crypto.randomUUID() };
  }

  // Electron 里建议通过 preload 暴露 window.ngm.pickFolder()
  async pickFolder(): Promise<string | null> {
    return null;
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
    return this.api.delete<void>(`/api/projects/delete/${id}`);
  }

  update(id: string, data: Partial<Project>) {
    return this.api.post<Project>(`/api/projects/update/${id}`, data);
  }
}
