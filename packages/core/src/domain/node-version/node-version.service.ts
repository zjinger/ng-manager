export interface NodeVersionInfo {
  current: string | null;
  manager: 'nvm' | 'none';
  available: string[];
}

export interface ProjectNodeRequirement {
  projectPath: string;
  /** 项目要求的 Node 版本 */
  requiredVersion: string | null;
  /** 当前系统可用的 Node 版本中满足要求的版本 */
  satisfiedBy: string | null;
  /** 是否当前系统 Node 版本满足要求 */
  isMatch: boolean;
}

export interface NodeVersionService {
  getCurrentVersion(): Promise<NodeVersionInfo>;
  switchVersion(version: string): Promise<NodeVersionInfo>;
  detectProjectRequirement(projectPath: string): Promise<ProjectNodeRequirement>;
  getManager(): 'nvm' | 'none';
}
