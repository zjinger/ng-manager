export const enum VersionManager {
  NVM = 'nvm',
  Volta = 'volta',
  NVM_Volta = 'nvm+volta',
  None = 'none',
}

export const enum ProjectType {
  Angular = 'angular',
  Vue = 'vue',
  Unknown = 'unknown',
}

export interface NodeVersionInfo {
  current: string | null;
  manager: VersionManager;
  available: string[];
}

export interface ProjectNodeRequirement {
  projectPath: string;
  /** 项目要求的 Node 版本（engines.node） */
  requiredVersion: string | null;
  /** 项目配置的 Volta 版本 */
  voltaConfig: string | null;
  /** 当前系统可用的 Node 版本中满足要求的版本 */
  satisfiedBy: string | null;
  /** 是否当前系统 Node 版本满足要求 */
  isMatch: boolean;
}

export interface NodeVersionService {
  getCurrentVersion(): Promise<NodeVersionInfo>;
  switchVersion(version: string, runId?: string): Promise<NodeVersionInfo>;
  detectProjectRequirement(projectPath: string): Promise<ProjectNodeRequirement>;
  getManager(): VersionManager;
  /**
   * 安装指定版本的Node.js
   * @param version 版本号（支持主版本号或者完整版本号）
   * @returns 返回是否成功及错误信息
   */
  installNodeVersion(version: string): Promise<{ success: boolean; error?: string; alreadyInstalled?: boolean }>;

  /**
   * 卸载指定版本的 Node.js
   * @param version 版本号
   * @returns 卸载是否成功
   */
  uninstallNodeVersion(version: string): Promise<boolean>;
}
