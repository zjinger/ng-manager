import { inject, Injectable, signal } from '@angular/core';
import { ProjectContextStore } from '@app/core/stores';
import { ApiClient } from '@core/api';
import { lastValueFrom } from 'rxjs';

export interface NodeVersionInfo {
  current: string | null;
  manager: 'nvm' | 'volta' | 'nvm+volta' | 'none';
  available: string[];
}

export interface ProjectNodeRequirement {
  /** 项目路径 */
  projectPath: string;
  /** 项目要求的 Node 版本 */
  requiredVersion: string | null;
  /** 项目 Volta 配置 */
  voltaConfig: string | null;
  /** 当前满足要求的 Node 版本 */
  satisfiedBy: string | null;
  /** 是否满足要求 */
  isMatch: boolean;
}

@Injectable({ providedIn: 'root' })
export class NodeVersionService {
  private api = inject(ApiClient);
  private projectContext = inject(ProjectContextStore);

  /** 当前 Node 版本 */
  readonly currentVersion = signal<string | null>(null);
  /** 可用版本列表 */
  readonly availableVersions = signal<string[]>([]);
  /** 当前版本管理器 */
  readonly manager = signal<'nvm' | 'volta' | 'nvm+volta' | 'none'>('none');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly switching = signal(false);
  readonly switchError = signal<string | null>(null);

  /** 项目 Node 版本要求 */
  readonly projectRequirement = signal<ProjectNodeRequirement | null>(null);

  /**
   * 是否安装了版本管理器
   */
  readonly hasVersionManager = signal(false);

  /**
   * 是否可以切换版本
   */
  readonly canSwitch = signal(false);

  /**
   * 获取未安装版本管理器的提示信息
   */
  getNoManagerMessage(): string {
    return '请先安装 NVM 或 Volta 才能使用自动切换 Node 版本功能';
  }

  async getCurrentVersion() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const result = await lastValueFrom(
        this.api.get<NodeVersionInfo>('/api/node-version/current'),
      );
      if (result) {
        this.currentVersion.set(result.current);
        this.availableVersions.set(result.available);
        this.manager.set(result.manager);
        this.hasVersionManager.set(result.manager !== 'none');
        this.canSwitch.set(result.manager !== 'none');
      }
    } catch (e: any) {
      this.error.set(e?.message || '获取 Node 版本信息失败');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 加载项目的 Node 版本要求
   */
  async loadProjectRequirement() {
    const projectPath = this.projectContext.currentProject()?.root;
    if (!projectPath) {
      this.projectRequirement.set(null);
      return;
    }
    try {
      const result = await lastValueFrom(
        this.api.post<ProjectNodeRequirement>('/api/node-version/project-requirement', {
          projectPath,
        }),
      );
      this.projectRequirement.set(result);
    } catch (e) {
      console.error('加载项目 Node 版本要求失败:', e);
      this.projectRequirement.set(null);
    }
  }

  /**
   * 切换 Node 版本
   * @param version 要切换到的版本号
   * @returns 切换是否成功
   */
  async switchVersion(version: string): Promise<boolean> {
    if (this.manager() === 'none') {
      this.switchError.set(this.getNoManagerMessage());
      return false;
    }

    this.switching.set(true);
    this.switchError.set(null);

    try {
      const result = await lastValueFrom(
        this.api.post<NodeVersionInfo>('/api/node-version/switch', { version }),
      );

      if (result) {
        this.currentVersion.set(result.current);
        this.availableVersions.set(result.available);
        this.manager.set(result.manager);
        return true;
      }
      return false;
    } catch (e: any) {
      const errorMsg = e?.error?.message || e?.message || '切换 Node 版本失败';
      this.switchError.set(errorMsg);
      return false;
    } finally {
      this.switching.set(false);
    }
  }

  /**
   * 清除切换版本的错误信息
   */
  clearSwitchError() {
    this.switchError.set(null);
  }

  /**
   * 清除常规错误信息
   */
  clearError() {
    this.error.set(null);
  }
  refresh() {
    this.getCurrentVersion();
    this.loadProjectRequirement();
  }
}
