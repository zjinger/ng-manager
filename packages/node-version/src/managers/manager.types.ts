// 管理器标识 — 区分 NVM-Windows / NVM-Unix / Volta / none
export enum ManagerKind {
  NVM_Windows = 'nvm-windows',
  NVM_Unix = 'nvm-unix',
  Volta = 'volta',
  None = 'none',
}

export enum ProjectType {
  Angular = 'angular',
  Vue = 'vue',
  Unknown = 'unknown',
}

export type ProjectTypeValue = 'angular' | 'vue' | 'unknown';

// 管理器检测扫描的原始结果
export interface ManagerDescriptor {
  kind: ManagerKind;
  // 管理器可执行文件路径（可检测时）
  binaryPath: string | null;
  // 调用方式 — 'exec-file' 或 'bash-source'
  invokeStyle: 'exec-file' | 'bash-source';
  // 仅 NVM-Unix 使用：nvm.sh 路径
  nvmShPath?: string | null;
}

// Version string normalised to 'vMAJOR.MINOR.PATCH'
export interface NormalisedVersion {
  raw: string;
  normalised: string; // 始终以 v 开头
}

// Installed version returned by a driver
export interface InstalledVersion {
  version: string; // normalised 'v1.2.3'
  isCurrent: boolean;
}
