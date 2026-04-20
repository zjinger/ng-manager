import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { AppError } from '../../common/errors';
import type { NodeVersionInfo, NodeVersionService, ProjectNodeRequirement } from './node-version.service';
import { findBestMatchingVersion, satisfiesVersion } from './node-version.utils';

const execFileAsync = promisify(execFile);

export class NodeVersionServiceImpl implements NodeVersionService {
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

  async switchVersion(version: string): Promise<NodeVersionInfo> {
    const manager = this.detectManager();

    if (manager === 'none') {
      throw new AppError('NO_VERSION_MANAGER', '没有安装 Node 版本管理器 (nvm)', {});
    }

    try {
      if (manager === 'nvm') {
        await execFileAsync('nvm', ['use', version], { windowsHide: true });
      }
    } catch (e: any) {
      throw new AppError('SWITCH_VERSION_FAILED', `切换 Node 版本失败: ${e?.message}`, { version, manager });
    }

    return this.getCurrentVersion();
  }

  /** 检测当前 Node 版本管理器 */
  private detectManager(): 'nvm' | 'none' {
    // 优先检查 PATH 环境变量
    const pathEnv = process.env.PATH || '';
    const pathDirs = pathEnv.split(path.delimiter);

    for (const dir of pathDirs) {
      const nvmExe = path.join(dir, 'nvm.exe');

      if (fs.existsSync(nvmExe)) {
        return 'nvm';
      }
    }

    // 如果 PATH 中没找到，检查常见安装路径
    const nvmPaths = ['C:\\Program Files\\nvm\\nvm.exe', 'C:\\ProgramData\\nvm\\nvm.exe', path.join(process.env.APPDATA || '', 'nvm', 'nvm.exe')];

    for (const nvmPath of nvmPaths) {
      if (fs.existsSync(nvmPath)) {
        return 'nvm';
      }
    }

    return 'none';
  }

  private async getNodeVersion(): Promise<string> {
    const { stdout } = await execFileAsync('node', ['-v'], { windowsHide: true });
    return stdout.trim();
  }

  /** 获取可用的 Node 版本 */
  private async getAvailableVersions(manager: 'nvm' | 'none'): Promise<string[]> {
    if (manager === 'none') {
      return [];
    }

    try {
      let stdout: string;

      if (manager === 'nvm') {
        const result = await execFileAsync('nvm', ['list'], { windowsHide: true });
        stdout = result.stdout;
      } else {
        return [];
      }

      const versions: string[] = [];
      const lines = stdout.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        // 跳过空行和已选中的版本
        if (!trimmed || trimmed.startsWith('*')) continue;

        const match = trimmed.match(/^v?(\d+\.\d+\.\d+)/);
        if (match) {
          versions.push('v' + match[1]);
        }
      }

      return versions;
    } catch {
      return [];
    }
  }

  /** 检测项目的 Node 版本要求 */
  async detectProjectRequirement(projectPath: string): Promise<ProjectNodeRequirement> {
    const requiredVersion = await this.readProjectNodeVersion(projectPath);
    const versionInfo = await this.getCurrentVersion();
    const currentVersion = versionInfo.current;

    let satisfiedBy: string | null = null;
    let isMatch = false;

    if (requiredVersion && currentVersion) {
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
      satisfiedBy,
      isMatch,
    };
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
  getManager(): 'nvm' | 'none' {
    return this.detectManager();
  }
}
