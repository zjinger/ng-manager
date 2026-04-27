import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { INodeVersionManagerDriver, NormalisedVersion, InstalledVersion } from './node-version-manager.driver';
import { ManagerDescriptor, ManagerKind } from './manager.types';

const execFileAsync = promisify(execFile);

function normalise(v: string): NormalisedVersion {
  const stripped = v.trim();
  const normalised = stripped.startsWith('v') ? stripped : `v${stripped}`;
  return { raw: stripped, normalised };
}

/**
 * NVM-Unix 需要在 bash 登录 shell 中 source `nvm.sh`：
 *   bash -lc 'source ~/.nvm/nvm.sh && nvm list'
 * 此处用 bash -lc 模拟登录 shell。
 */
export class NvmUnixDriver implements INodeVersionManagerDriver {
  readonly name = 'NVM-Unix';

  constructor(private descriptor: ManagerDescriptor) {}

  private get nvmSh(): string {
    return this.descriptor.nvmShPath ?? '~/.nvm/nvm.sh';
  }

  private async bashLc(cmd: string): Promise<string> {
    // 将 ~ 展开为 $HOME
    const sh = this.nvmSh.replace('~', '$HOME');
    const full = `source ${sh} && ${cmd}`;
    const { stdout } = await execFileAsync('bash', ['-lc', full]);
    return stdout;
  }

  async install(version: string): Promise<void> {
    const clean = version.replace(/^v/, '');
    await this.bashLc(`nvm install ${clean}`);
  }

  async uninstall(version: string): Promise<void> {
    const clean = version.replace(/^v/, '');
    await this.bashLc(`nvm uninstall ${clean}`);
  }

  async getCurrentVersion(): Promise<NormalisedVersion | null> {
    try {
      const stdout = await this.bashLc('nvm current');
      const v = stdout.trim();
      if (!v || v === 'N/A') return null;
      return normalise(v);
    } catch {
      return null;
    }
  }

  async listInstalled(): Promise<InstalledVersion[]> {
    const installed: InstalledVersion[] = [];
    try {
      const stdout = await this.bashLc('nvm list --no-colors');
      const lines = stdout.split('\n');
      const currentNv = await this.getCurrentVersion();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // 每行为一个版本，格式如 '      v18.19.1'
        const match = trimmed.match(/v?(\d+\.\d+\.\d+)/);
        if (!match) continue;
        const nv = normalise(match[1]);
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

export function createNvmUnixDriver(descriptor: ManagerDescriptor): INodeVersionManagerDriver {
  if (descriptor.kind !== ManagerKind.NVM_Unix) {
    throw new Error(`Expected NVM_Unix, got ${descriptor.kind}`);
  }
  return new NvmUnixDriver(descriptor);
}
