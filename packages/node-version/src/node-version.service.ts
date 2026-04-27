import { ManagerKind, ProjectType } from './node-version.types';

export enum VersionManager {
  NVM = 'nvm',
  Volta = 'volta',
  NVM_Volta = 'nvm+volta',
  None = 'none',
}

export interface NodeVersionInfo {
  current: string | null;
  manager: VersionManager;
  available: string[];
}

export interface ProjectNodeRequirement {
  projectPath: string;
  requiredVersion: string | null;
  voltaConfig: string | null;
  satisfiedBy: string | null;
  isMatch: boolean;
  hasEnginesConfig: boolean;
}

export interface NodeVersionService {
  getCurrentVersion(): Promise<NodeVersionInfo>;
  switchVersion(version: string, runId?: string): Promise<NodeVersionInfo>;
  detectProjectRequirement(projectPath: string): Promise<ProjectNodeRequirement>;
  getManager(): VersionManager;
  installNodeVersion(version: string): Promise<{ success: boolean; error?: string; alreadyInstalled?: boolean }>;
  uninstallNodeVersion(version: string): Promise<boolean>;
  writeEngineConfig(projectPath: string, version: string): Promise<boolean>;
}
