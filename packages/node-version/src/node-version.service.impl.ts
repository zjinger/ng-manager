import { CoreError, CoreErrorCodes } from '@yinuo-ngm/errors';
import type { SystemLogService } from '@yinuo-ngm/logger';
import {
  NodeVersionService,
  NodeVersionInfo,
  ProjectNodeRequirement,
  VersionManager,
} from './node-version.service';
import type { InstalledVersion } from './managers/manager.types';
import {
  ManagerKind,
  detectManager,
  createVoltaDriver,
  createNvmWindowsDriver,
  createNvmUnixDriver,
  NoneDriver,
} from './managers';
import type { INodeVersionManagerDriver } from './managers/node-version-manager.driver';
import { detectProjectRequirement } from './project-requirement';
import { writePackageJsonField } from './project-requirement/package-json.reader';

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

export class NodeVersionServiceImpl implements NodeVersionService {
  constructor(private sysLog: SystemLogService) {}

  private log(level: 'info' | 'warn' | 'error', text: string, refId?: string) {
    this.sysLog?.[level]({ source: 'node-version', scope: 'node-version', refId, text });
  }

  /** 每次操作前动态检测管理器，避免缓存导致重启才能识别新装的管理器。 */
  private resolveDriver(): {
    descriptor: { kind: ManagerKind };
    driver: INodeVersionManagerDriver;
  } {
    const descriptor = detectManager();
    switch (descriptor.kind) {
      case ManagerKind.Volta:
        return { descriptor, driver: createVoltaDriver(descriptor) };
      case ManagerKind.NVM_Windows:
        return { descriptor, driver: createNvmWindowsDriver(descriptor) };
      case ManagerKind.NVM_Unix:
        return { descriptor, driver: createNvmUnixDriver(descriptor) };
      default:
        return { descriptor, driver: new NoneDriver() };
    }
  }

  async getCurrentVersion(): Promise<NodeVersionInfo> {
    const { descriptor, driver } = this.resolveDriver();
    const [currentNv, installed] = await Promise.all([
      driver.getCurrentVersion(),
      driver.listInstalled(),
    ]);

    return {
      current: currentNv?.normalised ?? null,
      manager: kindToPublicManager(descriptor.kind),
      available: installed.map(v => v.version),
    };
  }

  async switchVersion(version: string, runId?: string): Promise<NodeVersionInfo> {
    const { descriptor, driver } = this.resolveDriver();

    if (descriptor.kind === ManagerKind.None) {
      this.log('warn', '没有安装 Node 版本管理器 (nvm/Volta)', runId);
      throw new CoreError(
        CoreErrorCodes.NO_VERSION_MANAGER,
        '没有安装 Node 版本管理器 (nvm/Volta)',
        {},
      );
    }

    const clean = version.replace(/^v/, '');
    this.log('info', `正在切换到 Node.js ${clean}，管理器: ${driver.name}`, runId);

    try {
      // use() 负责 install + activate（nvm）/ pin（Volta），确保版本被激活
      await driver.use(clean);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log('error', `切换 Node 版本失败: ${msg}`, runId);

      throw new CoreError(CoreErrorCodes.SWITCH_VERSION_FAILED, `切换 Node 版本失败: ${msg}`, {
        version,
        manager: kindToPublicManager(descriptor.kind),
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
    const { descriptor } = this.resolveDriver();
    return kindToPublicManager(descriptor.kind);
  }

  async installNodeVersion(
    version: string,
  ): Promise<{ success: boolean; error?: string; alreadyInstalled?: boolean }> {
    const { descriptor, driver } = this.resolveDriver();

    if (descriptor.kind === ManagerKind.None) {
      this.log('warn', '没有安装 Node 版本管理器，无法自动安装');
      return { success: false, error: '没有安装 Node 版本管理器 (nvm/Volta)' };
    }

    const clean = version.replace(/^v/, '');
    this.log('info', `开始安装 Node.js ${clean}，管理器: ${driver.name}`);

    try {
      await driver.install(clean);
      this.log('info', `Node.js ${clean} 安装成功`);
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // 尝试从错误信息中判断是否已安装（启发式）
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
    const { descriptor, driver } = this.resolveDriver();

    if (descriptor.kind === ManagerKind.None) {
      this.log('warn', '没有安装 Node 版本管理器，无法卸载');
      return false;
    }

    const clean = version.replace(/^v/, '');
    this.log('info', `开始卸载 Node.js ${clean}，管理器: ${driver.name}`);

    try {
      await driver.uninstall(clean);
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
