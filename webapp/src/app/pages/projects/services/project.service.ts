import { inject, Injectable } from '@angular/core';
import { CreateProjectDraft } from '../models/project-draft';
import { ApiClient } from '@app/core/api/api-client';
import { Project } from '@models/project.model';

export interface DetectResult {
  framework?: string;
  hasPackageJson?: boolean;
  scripts?: string[];
  lockFile?: 'pnpm' | 'yarn' | 'npm' | 'none';
  hasGit?: boolean;
  hasMakefile?: boolean;
  hasDockerCompose?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {

  api = inject(ApiClient)

  async checkPathExists(_rootPath: string): Promise<boolean> {
    // TODO: 调用本地服务检查路径是否存在 & 是否重复注册
    return true;
  }

  async detectProject(_rootPath: string): Promise<DetectResult> {
    // TODO: 调用本地服务扫描 package.json / lockfile / .git / Makefile / compose
    return {
      framework: 'Unknown',
      hasPackageJson: false,
      scripts: [],
      lockFile: 'none',
      hasGit: false,
      hasMakefile: false,
      hasDockerCompose: false,
    };
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

  create(data: { name: string; root: string }) {
    return this.api.post<Project>("/api/projects/new", data);
  }

  delete(id: string) {
    return this.api.delete<void>(`/api/projects/delete/${id}`);
  }

  update(id: string, data: Partial<Project>) { 
    return this.api.post<Project>(`/api/projects/update/${id}`, data);
  }
}
