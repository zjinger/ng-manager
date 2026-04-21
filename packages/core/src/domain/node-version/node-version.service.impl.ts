import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { AppError } from '../../common/errors';
import type { SystemLogService } from '../logger';
import { getEnginesByAngular } from './angular-node.version';
import { NodeVersionInfo, NodeVersionService, ProjectNodeRequirement, ProjectType, VersionManager } from './node-version.service';
import { findBestMatchingVersion, satisfiesVersion } from './node-version.utils';
import { getEnginesByVue } from './vue-node.version';

const execFileAsync = promisify(execFile);

export class NodeVersionServiceImpl implements NodeVersionService {
  constructor(private sysLog: SystemLogService) {}

  async getCurrentVersion(): Promise<NodeVersionInfo> {
    const manager = this.detectManager();
    let current: string | null = null;
    let available: string[] = [];

    try {
      current = await this.getNodeVersion();
    } catch {
      current = null;
    }

    try {
      available = await this.getAvailableVersions(manager);
    } catch {
      available = [];
    }

    return {
      current,
      manager,
      available,
    };
  }

  async switchVersion(version: string, runId?: string): Promise<NodeVersionInfo> {
    const manager = this.detectManager();
    if (manager === VersionManager.None) {
      this.logText('没有安装 Node 版本管理器 (nvm/Volta)', 'warn');
      throw new AppError('NO_VERSION_MANAGER', '没有安装 Node 版本管理器 (nvm/Volta)', {});
    }
    this.logText(`检测到版本管理器: ${manager}`);

    try {
      if (manager === VersionManager.Volta || manager === VersionManager.NVM_Volta) {
        let command: string;
        let args: string[];
        if (version.startsWith('node@')) {
          command = 'volta';
          args = ['install', version];
        } else {
          command = 'volta';
          args = ['install', `node@${version.replace(/^v/, '')}`];
        }
        this.logText(`执行命令: ${command} ${args.join(' ')}`);
        await execFileAsync(command, args, { windowsHide: true });
      } else if (manager === VersionManager.NVM) {
        const nvmVersion = version.replace(/^v/, '');
        this.logText(`执行命令: nvm use ${nvmVersion}`);
        await execFileAsync('nvm', ['use', nvmVersion], { windowsHide: true });
      }
    } catch (e: any) {
      this.logText(`切换 Node 版本失败: ${e?.message}`, 'error');
      throw new AppError('SWITCH_VERSION_FAILED', `切换 Node 版本失败: ${e?.message}`, { version, manager });
    }

    return this.getCurrentVersion();
  }

  /** 检测当前 Node 版本管理器 */
  private detectManager(): VersionManager {
    const hasNvm = this.detectNvm();
    const hasVolta = this.detectVolta();
    if (hasNvm && hasVolta) {
      return VersionManager.NVM_Volta;
    } else if (hasNvm) {
      return VersionManager.NVM;
    } else if (hasVolta) {
      return VersionManager.Volta;
    }
    return VersionManager.None;
  }

  /** 检测 NVM 是否安装 */
  private detectNvm(): boolean {
    const pathEnv = process.env.PATH || '';
    const pathDirs = pathEnv.split(path.delimiter);

    for (const dir of pathDirs) {
      const nvmExe = path.join(dir, 'nvm.exe');
      if (fs.existsSync(nvmExe)) {
        return true;
      }
    }

    const nvmPaths = ['C:\\Program Files\\nvm\\nvm.exe', 'C:\\ProgramData\\nvm\\nvm.exe', path.join(process.env.APPDATA || '', 'nvm', 'nvm.exe')];
    for (const nvmPath of nvmPaths) {
      if (fs.existsSync(nvmPath)) {
        return true;
      }
    }

    return false;
  }

  /** 检测 Volta 是否安装 */
  private detectVolta(): boolean {
    const pathEnv = process.env.PATH || '';
    const pathDirs = pathEnv.split(path.delimiter);

    for (const dir of pathDirs) {
      const voltaExe = path.join(dir, 'volta.exe');
      if (fs.existsSync(voltaExe)) {
        return true;
      }
    }

    const voltaPaths = [path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Volta', 'volta.exe'), path.join(process.env.APPDATA || '', 'volta', 'volta.exe')];
    for (const voltaPath of voltaPaths) {
      if (fs.existsSync(voltaPath)) {
        return true;
      }
    }

    return false;
  }

  private async getNodeVersion(): Promise<string> {
    const manager = this.detectManager();

    // 如果使用 Volta，优先通过 volta list node 获取当前版本
    // 因为当前进程的 node 路径可能是旧版本，需要通过 Volta 查询
    if (manager === VersionManager.Volta || manager === VersionManager.NVM_Volta) {
      try {
        const result = await execFileAsync('volta', ['list', 'node'], { windowsHide: true });
        const lines = result.stdout.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.includes('(default)') || trimmed.includes('Node.js:')) {
            const match = trimmed.match(/(\d+\.\d+\.\d+)/);
            if (match) {
              return 'v' + match[1];
            }
          }
        }
      } catch {}
    }

    const { stdout } = await execFileAsync('node', ['-v'], { windowsHide: true });
    return stdout.trim();
  }

  /** 获取可用的 Node 版本 */
  private async getAvailableVersions(manager: VersionManager): Promise<string[]> {
    if (manager === VersionManager.None) {
      return [];
    }

    const versions: Set<string> = new Set();

    try {
      // Volta 的版本列表
      if (manager === VersionManager.Volta || manager === VersionManager.NVM_Volta) {
        try {
          const result = await execFileAsync('volta', ['list', 'node'], { windowsHide: true });
          const lines = result.stdout.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const match = trimmed.match(/(\d+\.\d+\.\d+)/);
            if (match) {
              versions.add('v' + match[1]);
            }
          }
          if (versions.size > 0) {
            return Array.from(versions);
          }
        } catch {}
      }

      // Volta 没有版本时，检测 NVM
      if (manager === VersionManager.NVM || manager === VersionManager.NVM_Volta) {
        const result = await execFileAsync('nvm', ['list'], { windowsHide: true });
        const lines = result.stdout.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('*')) continue;

          const match = trimmed.match(/^v?(\d+\.\d+\.\d+)/);
          if (match) {
            versions.add('v' + match[1]);
          }
        }
      }
    } catch {
      return [];
    }

    return Array.from(versions);
  }

  /** 检测项目的 Node 版本要求 */
  async detectProjectRequirement(projectPath: string): Promise<ProjectNodeRequirement> {
    const requiredVersion = await this.readProjectNodeVersion(projectPath);
    const voltaVersion = await this.readProjectVoltaConfig(projectPath);
    const versionInfo = await this.getCurrentVersion();
    const currentVersion = versionInfo.current;

    let satisfiedBy: string | null = null;
    let isMatch = false;

    if (voltaVersion) {
      satisfiedBy = currentVersion;
      isMatch = true;
    } else if (requiredVersion && currentVersion) {
      isMatch = satisfiesVersion(currentVersion, requiredVersion);
      if (isMatch) {
        satisfiedBy = currentVersion;
      } else {
        const matchingVersion = findBestMatchingVersion(versionInfo.available, requiredVersion);
        if (matchingVersion) {
          satisfiedBy = matchingVersion;
        }
      }
    }

    return {
      projectPath,
      requiredVersion,
      voltaConfig: voltaVersion,
      satisfiedBy,
      isMatch,
    };
  }

  /**
   * 读取项目 package.json 中的 volta 配置
   * @param projectPath 项目路径
   * @returns volta.node 版本或 null（如果未配置）
   */
  private async readProjectVoltaConfig(projectPath: string): Promise<string | null> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);

      if (pkg.volta && pkg.volta.node) {
        return pkg.volta.node;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 读取项目 package.json 中的 Node 版本要求
   * @param projectPath 项目路径
   * @returns Node 版本要求字符串（如 ">=14.0.0"）或 null（如果未指定）
   */
  private async readProjectNodeVersion(projectPath: string): Promise<string | null> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);

      /** 1.优先从 engines.node 获取 */
      if (pkg.engines && pkg.engines.node) {
        return pkg.engines.node;
      }

      /** 2.检测项目类型，根据类型推荐 Node 版本 */
      const projectType = this.detectProjectType(pkg);
      /** Angular 项目 */
      if (projectType === ProjectType.Angular) {
        const angularVersion = this.detectAngularVersion(pkg);
        if (angularVersion) {
          const engines = getEnginesByAngular(angularVersion);
          return engines.node;
        }
      } else if (projectType === ProjectType.Vue) {
        /** Vue 项目 */
        const vueVersion = this.detectVueVersion(pkg);
        if (vueVersion) {
          const engines = getEnginesByVue(vueVersion);
          return engines.node;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 从 package.json 检测 Angular 版本
   * @param pkg package.json 解析后的对象
   * @returns Angular 主版本号（如 17、18、19 等）或 null
   */
  private detectAngularVersion(pkg: any): number | null {
    const deps = { ...(pkg.dependencies || {}) };

    for (const [dep, version] of Object.entries(deps)) {
      if (dep === '@angular/core' && typeof version === 'string') {
        const match = version.match(/^[\^~]?(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    }

    return null;
  }

  /**
   * 从 package.json 检测 Vue 版本
   * @param pkg package.json 解析后的对象
   * @returns Vue 主版本号（如 2、3 等）或 null
   */
  private detectVueVersion(pkg: any): number | null {
    const deps = { ...(pkg.dependencies || {}) };

    for (const [dep, version] of Object.entries(deps)) {
      if ((dep === 'vue' || dep === '@vue/runtime-core') && typeof version === 'string') {
        const match = version.match(/^[\^~]?(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    }

    return null;
  }

  /**
   * 检测项目类型（Angular / Vue / Unknown）
   * @param pkg package.json 解析后的对象
   * @returns ProjectType
   */
  private detectProjectType(pkg: any): ProjectType {
    if (this.detectAngularVersion(pkg)) {
      return ProjectType.Angular;
    }

    if (this.detectVueVersion(pkg)) {
      return ProjectType.Vue;
    }

    return ProjectType.Unknown;
  }

  /**
   * 获取当前版本管理器
   */
  getManager(): VersionManager {
    return this.detectManager();
  }
  private logText(text: string, level: 'info' | 'warn' | 'error' = 'info') {
    this.sysLog?.[level]({ scope: 'task', text });
  }
}
