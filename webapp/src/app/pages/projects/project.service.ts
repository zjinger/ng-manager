import { Injectable } from '@angular/core';
import { CreateProjectDraft } from './models/project-draft';
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
}
