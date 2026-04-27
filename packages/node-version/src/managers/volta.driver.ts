import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { INodeVersionManagerDriver, NormalisedVersion, InstalledVersion } from './node-version-manager.driver';
import { ManagerDescriptor, ManagerKind } from './manager.types';
import { normalizeVersion } from '../node-version.utils';

const execFileAsync = promisify(execFile);

/** 从 `volta current node` 输出中提取 Node 版本。
 *
 * 输出可能为多行，格式示例：
 *   node    20.19.0 (with manifest /path/to/default.json)
 *   node    v20.19.0
 *   Node: v20.19.0
 *   node: v20.19.0
 *
 * 这里提取第一个符合版本格式的令牌。
 */
function extractNodeVersion(stdout: string): NormalisedVersion | null {
  const match = stdout.match(/node\s*:?\s+(v?\d+\.\d+\.\d+)/im);
  if (!match) return null;
  return normalizeVersion(match[1]);
}

export class VoltaDriver implements INodeVersionManagerDriver {
  readonly name = 'Volta';

  constructor(private descriptor: ManagerDescriptor) {}

  private get binary(): string {
    return this.descriptor.binaryPath ?? 'volta';
  }

  async install(version: string): Promise<void> {
    // 支持 '18'、'18.2.0'、'v18.2.0'、'node@18' 等多种格式
    let spec = version;
    if (!spec.startsWith('node@')) {
      spec = `node@${version.replace(/^v/, '')}`;
    }
    await execFileAsync(this.binary, ['install', spec], { windowsHide: true });
  }

  async uninstall(version: string): Promise<void> {
    const clean = version.replace(/^v/, '');
    await execFileAsync(this.binary, ['uninstall', `node@${clean}`], { windowsHide: true });
  }

  /**
   * Volta install 确保版本可用并将其设为默认工具版本（相当于 nvm install + nvm use）。
   * use() 等同于 install，Volta 无需单独 pin 操作。
   * 项目级 pin（写入 package.json volta 字段）后续单独支持。
   */
  async use(version: string): Promise<void> {
    await this.install(version);
  }

  async getCurrentVersion(): Promise<NormalisedVersion | null> {
    try {
      const { stdout } = await execFileAsync(this.binary, ['current', 'node'], { windowsHide: true });
      return extractNodeVersion(stdout);
    } catch {
      return null;
    }
  }

  async listInstalled(): Promise<InstalledVersion[]> {
    const installed: InstalledVersion[] = [];
    try {
      const { stdout } = await execFileAsync(this.binary, ['list', 'node', '--format', 'plain'], {
        windowsHide: true,
      });
      const lines = stdout.split('\n');
      const current = await this.getCurrentVersion();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // 兼容多种格式：
        //   node    20.19.0
        //   node    v20.19.0
        //   node@20.19.0
        //   20.19.0 (plain)
        const match =
          trimmed.match(/node\s*:?\s+(v?\d+\.\d+\.\d+)/i) ??
          trimmed.match(/node@?(v?\d+\.\d+\.\d+)/i) ??
          trimmed.match(/\b(v?\d+\.\d+\.\d+)\b/);
        if (!match) continue;
        const nv = normalizeVersion(match[1]);
        installed.push({
          version: nv.normalised,
          isCurrent: current?.normalised === nv.normalised,
        });
      }
    } catch {
      // Volta list 可能失败（无任何版本时）
    }
    return installed;
  }
}

export function createVoltaDriver(descriptor: ManagerDescriptor): INodeVersionManagerDriver {
  if (descriptor.kind === ManagerKind.None) {
    throw new Error('Cannot create VoltaDriver for ManagerKind.None');
  }
  return new VoltaDriver(descriptor);
}
