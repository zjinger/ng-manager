import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { AppError } from '../../common/errors';
import type { SystemLogService } from '../logger';
import type { NodeVersionInfo, NodeVersionService, ProjectNodeRequirement } from './node-version.service';
import { findBestMatchingVersion, satisfiesVersion } from './node-version.utils';

const execFileAsync = promisify(execFile);

export class NodeVersionServiceImpl implements NodeVersionService {
  constructor(private sysLog?: SystemLogService) {}

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

    const logText = (text: string, level: 'info' | 'warn' | 'error' = 'info') => {
      if (this.sysLog) {
        if (runId) {
          this.sysLog[level]({ refId: runId, scope: 'task', text });
        } else {
          this.sysLog[level]({ scope: 'task', text });
        }
      }
      console.log(`[NodeVersion] ${text}`);
    };

    logText(`检测到版本管理器: ${manager}`);
    if (manager === 'none') {
      throw new AppError('NO_VERSION_MANAGER', '没有安装 Node 版本管理器 (nvm/Volta)', {});
    }

    try {
      if (manager === 'volta' || manager === 'nvm+volta') {
        let command: string;
        let args: string[];
        if (version.startsWith('node@')) {
          command = 'volta';
          args = ['install', version];
        } else {
          command = 'volta';
          args = ['install', `node@${version.replace(/^v/, '')}`];
        }
        logText(`执行命令: ${command} ${args.join(' ')}`);
        await execFileAsync(command, args, { windowsHide: true });
      } else if (manager === 'nvm') {
        const nvmVersion = version.replace(/^v/, '');
        logText(`执行命令: nvm use ${nvmVersion}`);
        await execFileAsync('nvm', ['use', nvmVersion], { windowsHide: true });
      }
    } catch (e: any) {
      logText(`切换 Node 版本失败: ${e?.message}`, 'error');
      throw new AppError('SWITCH_VERSION_FAILED', `切换 Node 版本失败: ${e?.message}`, { version, manager });
    }

    return this.getCurrentVersion();
  }

  /** 检测当前 Node 版本管理器 */
  private detectManager(): 'nvm' | 'volta' | 'nvm+volta' | 'none' {
    const hasNvm = this.detectNvm();
    const hasVolta = this.detectVolta();
    console.log('[NodeVersion]  detectNvm:', hasNvm, '| detectVolta:', hasVolta);
    if (hasNvm && hasVolta) {
      return 'nvm+volta';
    } else if (hasNvm) {
      return 'nvm';
    } else if (hasVolta) {
      return 'volta';
    }
    return 'none';
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
    if (manager === 'volta' || manager === 'nvm+volta') {
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
  private async getAvailableVersions(manager: 'nvm' | 'volta' | 'nvm+volta' | 'none'): Promise<string[]> {
    if (manager === 'none') {
      return [];
    }

    const versions: Set<string> = new Set();

    try {
      // Volta 的版本列表
      if (manager === 'volta' || manager === 'nvm+volta') {
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
      if (manager === 'nvm' || manager === 'nvm+volta') {
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

      if (pkg.engines && pkg.engines.node) {
        return pkg.engines.node;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 获取当前版本管理器
   */
  getManager(): 'nvm' | 'volta' | 'nvm+volta' | 'none' {
    return this.detectManager();
  }
}
