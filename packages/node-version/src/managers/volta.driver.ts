import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { INodeVersionManagerDriver, NormalisedVersion, InstalledVersion } from './node-version-manager.driver';
import { ManagerDescriptor, ManagerKind } from './manager.types';

const execFileAsync = promisify(execFile);

/** 将 Volta 版本字符串规范化为 'v大版本.次版本.补丁'。 */
function normalise(v: string): NormalisedVersion {
  const stripped = v.trim();
  const normalised = stripped.startsWith('v') ? stripped : `v${stripped}`;
  return { raw: stripped, normalised };
}

/** 从 `volta current` 输出中提取 Node 版本。
 *
 * Volta 的 `current` 输出为多行，可能包含额外工具信息。
 * 示例：
 *   node    20.19.0 (with manifest /path/to/default.json)
 *   node    v20.19.0
 *
 * 这里提取第一个符合版本格式的令牌。
 */
function extractNodeVersion(stdout: string): NormalisedVersion | null {
  const match = stdout.match(/node\s+(v?\d+\.\d+\.\d+)/m);
  if (!match) return null;
  return normalise(match[1]);
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
        // 格式："node    20.19.0" 或 "node    v20.19.0"
        const match = trimmed.match(/node\s+(v?\d+\.\d+\.\d+)/);
        if (!match) continue;
        const nv = normalise(match[1]);
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
