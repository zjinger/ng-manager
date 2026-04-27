import { CoreError, CoreErrorCodes } from '@yinuo-ngm/errors';
import type { SystemLogService } from '@yinuo-ngm/logger';
import {
  NodeVersionService,
  NodeVersionInfo,
  ProjectNodeRequirement,
  VersionManager,
} from './node-version.service';
import type { INodeVersionManagerDriver } from './managers/node-version-manager.driver';
import type { InstalledVersion } from './managers/manager.types';
import {
  ManagerKind,
  detectManager,
  createVoltaDriver,
  createNvmWindowsDriver,
  createNvmUnixDriver,
  NoneDriver,
} from './managers';
import { detectProjectRequirement } from './project-requirement';
import { writePackageJsonField } from './project-requirement/package-json.reader';
import { satisfiesVersion } from './node-version.utils';

// 将内部 ManagerKind 映射为对外 VersionManager
function kindToPublicManager(kind: ManagerKind): VersionManager {
  switch (kind) {
    case ManagerKind.NVM_Windows:
    case ManagerKind.NVM_Unix:
      return VersionManager.NVM;
    case ManagerKind.Volta:
      return VersionManager.Volta;
    default:
      return VersionManager.None;
  }
}

// 根据检测到的管理器类型构造对应的 driver 实例
function buildDriver(): INodeVersionManagerDriver {
  const descriptor = detectManager();
  switch (descriptor.kind) {
    case ManagerKind.Volta:
      return createVoltaDriver(descriptor);
    case ManagerKind.NVM_Windows:
      return createNvmWindowsDriver(descriptor);
    case ManagerKind.NVM_Unix:
      return createNvmUnixDriver(descriptor);
    default:
      return new NoneDriver();
  }
}

export class NodeVersionServiceImpl implements NodeVersionService {
  private driver: INodeVersionManagerDriver;
  private descriptor = detectManager();

  constructor(private sysLog: SystemLogService) {
    this.driver = buildDriver();
  }

  private log(level: 'info' | 'warn' | 'error', text: string) {
    this.sysLog?.[level]({ scope: 'task', text });
  }

  async getCurrentVersion(): Promise<NodeVersionInfo> {
    const [currentNv, installed] = await Promise.all([
      this.driver.getCurrentVersion(),
      this.driver.listInstalled(),
    ]);

    return {
      current: currentNv?.normalised ?? null,
      manager: kindToPublicManager(this.descriptor.kind),
      available: installed.map(v => v.version),
    };
  }

  async switchVersion(version: string, _runId?: string): Promise<NodeVersionInfo> {
    if (this.descriptor.kind === ManagerKind.None) {
      this.log('warn', '没有安装 Node 版本管理器 (nvm/Volta)');
      throw new CoreError(
        CoreErrorCodes.NO_VERSION_MANAGER,
        '没有安装 Node 版本管理器 (nvm/Volta)',
        {},
      );
    }

    const clean = version.replace(/^v/, '');
    this.log('info', `正在安装/切换到 Node.js ${clean}，管理器: ${this.driver.name}`);

    try {
      await this.driver.install(clean);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log('error', `切换 Node 版本失败: ${msg}`);
      throw new CoreError(CoreErrorCodes.SWITCH_VERSION_FAILED, `切换 Node 版本失败: ${msg}`, {
        version,
        manager: kindToPublicManager(this.descriptor.kind),
      });
    }

    return this.getCurrentVersion();
  }

  async detectProjectRequirement(projectPath: string): Promise<ProjectNodeRequirement> {
    const { current, available } = await this.getCurrentVersion();
    const installed: InstalledVersion[] = available.map(v => ({
      version: v,
      isCurrent: v === current,
    }));

    return detectProjectRequirement({
      projectPath,
      currentVersion: current,
      available: installed,
    });
  }

  getManager(): VersionManager {
    return kindToPublicManager(this.descriptor.kind);
  }

  async installNodeVersion(
    version: string,
  ): Promise<{ success: boolean; error?: string; alreadyInstalled?: boolean }> {
    if (this.descriptor.kind === ManagerKind.None) {
      this.log('warn', '没有安装 Node 版本管理器，无法自动安装');
      return { success: false, error: '没有安装 Node 版本管理器 (nvm/Volta)' };
    }

    const clean = version.replace(/^v/, '');
    this.log('info', `开始安装 Node.js ${clean}，管理器: ${this.driver.name}`);

    try {
      await this.driver.install(clean);
      this.log('info', `Node.js ${clean} 安装成功`);
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Check for "already installed" in the error message (heuristic)
      const alreadyInstalled = /already\s+installed/i.test(msg);
      if (alreadyInstalled) {
        this.log('info', `Node.js ${clean} 已安装，跳过安装`);
        return { success: true, alreadyInstalled: true };
      }
      this.log('error', `Node.js ${clean} 安装失败: ${msg}`);
      return { success: false, error: msg };
    }
  }

  async uninstallNodeVersion(version: string): Promise<boolean> {
    if (this.descriptor.kind === ManagerKind.None) {
      this.log('warn', '没有安装 Node 版本管理器，无法卸载');
      return false;
    }

    const clean = version.replace(/^v/, '');
    this.log('info', `开始卸载 Node.js ${clean}，管理器: ${this.driver.name}`);

    try {
      await this.driver.uninstall(clean);
      this.log('info', `Node.js ${clean} 卸载成功`);
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log('error', `Node.js ${clean} 卸载失败: ${msg}`);
      return false;
    }
  }

  async writeEngineConfig(projectPath: string, version: string): Promise<boolean> {
    this.log('info', `写入 engines.node = ${version} 到 ${projectPath}/package.json`);
    try {
      await writePackageJsonField(projectPath, 'engines.node', version);
      this.log('info', `engines.node 已写入: ${version}`);
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log('error', `写入 engines.node 失败: ${msg}`);
      return false;
    }
  }
}
