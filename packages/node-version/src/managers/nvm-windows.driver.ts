import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { INodeVersionManagerDriver, NormalisedVersion, InstalledVersion } from './node-version-manager.driver';
import { ManagerDescriptor, ManagerKind } from './manager.types';
import { normalizeVersion } from '../node-version.utils';

const execFileAsync = promisify(execFile);

export class NvmWindowsDriver implements INodeVersionManagerDriver {
  readonly name = 'NVM-Windows';

  constructor(private descriptor: ManagerDescriptor) {}

  private get binary(): string {
    return this.descriptor.binaryPath ?? 'nvm';
  }

  async install(version: string): Promise<void> {
    const clean = version.replace(/^v/, '');
    await execFileAsync(this.binary, ['install', clean], { windowsHide: true });
  }

  async uninstall(version: string): Promise<void> {
    const clean = version.replace(/^v/, '');
    await execFileAsync(this.binary, ['uninstall', clean], { windowsHide: true });
  }

  /**
   * NVM-Windows 的 use 必须目标版本已安装，未安装时直接失败。
   * 此处先 install 再 use，确保版本存在。
   */
  async use(version: string): Promise<void> {
    const clean = version.replace(/^v/, '');
    await this.install(clean);
    await execFileAsync(this.binary, ['use', clean], { windowsHide: true });
  }

  async getCurrentVersion(): Promise<NormalisedVersion | null> {
    try {
      const { stdout } = await execFileAsync(this.binary, ['current'], { windowsHide: true });
      const v = stdout.trim();
      if (!v || v === 'No Active Version') return null;
      // nvm-windows current 可能返回 'v20.19.0' 或纯 '20.19.0'
      return normalizeVersion(v);
    } catch {
      return null;
    }
  }

  async listInstalled(): Promise<InstalledVersion[]> {
    const installed: InstalledVersion[] = [];
    try {
      const { stdout } = await execFileAsync(this.binary, ['list'], { windowsHide: true });
      const lines = stdout.split('\n');
      const currentNv = await this.getCurrentVersion();

      for (const line of lines) {
        const trimmed = line.trim();
        // 跳过空行和表头行（如 'Versions:' 等）
        if (!trimmed) continue;
        if (/^[A-Za-z]/.test(trimmed) && !trimmed.startsWith('*')) continue;

        // 匹配 'v18.19.1'、'* v20.19.0'、'  * v22.12.0 (64-bit)'
        // 去掉 * 前缀后再规范化，确保当前版本也被包含在内
        const match = trimmed.match(/(?:\*\s*)?v?(\d+\.\d+\.\d+)/);
        if (!match) continue;

        const nv = normalizeVersion(match[1]);
        installed.push({
          version: nv.normalised,
          isCurrent: currentNv?.normalised === nv.normalised,
        });
      }
    } catch {
      // nvm list 可能失败
    }
    return installed;
  }
}

export function createNvmWindowsDriver(descriptor: ManagerDescriptor): INodeVersionManagerDriver {
  if (descriptor.kind !== ManagerKind.NVM_Windows) {
    throw new Error(`Expected NVM_Windows, got ${descriptor.kind}`);
  }
  return new NvmWindowsDriver(descriptor);
}
