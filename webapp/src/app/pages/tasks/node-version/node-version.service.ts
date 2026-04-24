import { inject, Injectable, signal } from '@angular/core';
import { ProjectContextStore } from '@app/core/stores';
import { ApiClient, getApiErrorMessage } from '@core/api';
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
  /** 是否在 package.json 中配置了 engines.node 字段 */
  hasEnginesConfig: boolean;
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

  /** 官方推荐版本列表 */
  readonly recommendedVersions = signal<string[]>([]);

  /** 版本是否已安装 */
  readonly alreadyInstalled = signal(false);

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
      const errorMsg = getApiErrorMessage(e, '切换 Node 版本失败');
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

  /**
   * 根据项目要求的版本号生成推荐的版本列表
   * 支持解析 ">=18.0.0"、"^18.19.1 || ^20.11.1" 等格式
   * @param requiredVersion 项目要求的版本号
   * @returns 推荐的版本数组
   */
  generateRecommendedVersions(requiredVersion: string | null): string[] {
    if (!requiredVersion) {
      return this.getCommonLTSVersions();
    }

    /** 从版本范围中提取主版本号和最小版本号 */
    const extractVersions = (range: string): string | null => {
      const cleaned = range.replace(/^[\^~>=<]+/, '');
      const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
      if (match) {
        return `v${match[1]}.${match[2]}.${match[3]}`;
      }
      return null;
    };

    /** 分割版本范围（如 ">=18.0.0 || ^20.0.0"） */
    const ranges = requiredVersion.split('||').map((r) => r.trim());
    const recommended: Set<string> = new Set();

    for (const range of ranges) {
      const version = extractVersions(range);
      if (version) {
        recommended.add(version);
      }
    }

    if (recommended.size === 0) {
      return this.getCommonLTSVersions();
    }

    return Array.from(recommended);
  }

  /** 获取常用的 LTS 版本列表 */
  private getCommonLTSVersions(): string[] {
    return ['v18.20.0', 'v20.11.0', 'v22.11.0'];
  }

  /**
   * 下载并安装指定版本的 Node.js
   * @param version 要安装的版本号
   * @returns 安装是否成功
   */
  async installVersion(version: string): Promise<boolean> {
    if (this.manager() === 'none') {
      this.switchError.set(this.getNoManagerMessage());
      return false;
    }
    this.error.set(null);
    try {
      const result = await lastValueFrom(
        this.api.post<{ success: boolean; error?: string; alreadyInstalled?: boolean }>(
          `/api/node-version/install`,
          { version },
        ),
      );
      if (result.success) {
        this.alreadyInstalled.set(!!result.alreadyInstalled);
        return true;
      } else {
        this.error.set(result.error || '安装失败');
        return false;
      }
    } catch (e: any) {
      const errorMsg = getApiErrorMessage(e, '安装 Node 版本失败');
      this.error.set(errorMsg);
      return false;
    }
  }

  /**
   * 获取官方推荐版本列表
   */
  async loadRecommendedVersions(): Promise<void> {
    try {
      const versions = await lastValueFrom(this.api.get<string[]>('/api/node-version/recommended'));
      this.recommendedVersions.set(versions);
    } catch (e) {
      console.error('获取推荐版本失败:', e);
      this.recommendedVersions.set(this.getFallbackVersions());
    }
  }

  /** 备用版本列表 */
  private getFallbackVersions(): string[] {
    return ['v18.20.0', 'v20.11.0', 'v22.11.0'];
  }

  refresh() {
    this.getCurrentVersion();
    this.loadProjectRequirement();
  }

  /**
   * 删除指定版本的 Node.js
   * @param version 要删除的版本号
   * @returns 删除是否成功
   */
  async deleteVersion(version: string): Promise<boolean> {
    if (this.manager() === 'none') {
      this.error.set('没有安装 Node 版本管理器');
      return false;
    }

    try {
      const success = await lastValueFrom(
        this.api.post<boolean>(`/api/node-version/uninstall`, { version }),
      );
      return success;
    } catch (e: any) {
      this.error.set(getApiErrorMessage(e, '删除版本失败'));
      return false;
    }
  }

  /**
   * 写入 engines.node 到 package.json
   * @param version 要写入的版本要求（如 ">=18.0.0"）
   * @returns 写入是否成功
   */
  async writeEngineConfig(version: string): Promise<boolean> {
    const projectPath = this.projectContext.currentProject()?.root;
    if (!projectPath) {
      this.error.set('未找到当前项目');
      return false;
    }

    try {
      const success = await lastValueFrom(
        this.api.post<boolean>(`/api/node-version/write-engine-config`, {
          projectPath,
          version,
        }),
      );
      return success;
    } catch (e: any) {
      this.error.set(getApiErrorMessage(e, '写入配置失败'));
      return false;
    }
  }
}
