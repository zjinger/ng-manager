import { INodeVersionManagerDriver, NormalisedVersion, InstalledVersion } from './node-version-manager.driver';

/** 未检测到版本管理器时的降级桩。 */
export class NoneDriver implements INodeVersionManagerDriver {
  readonly name = 'None';

  async install(_version: string): Promise<void> {
    throw new Error('No version manager installed');
  }

  async uninstall(_version: string): Promise<void> {
    throw new Error('No version manager installed');
  }

  async getCurrentVersion(): Promise<NormalisedVersion | null> {
    return null;
  }

  async listInstalled(): Promise<InstalledVersion[]> {
    return [];
  }
}
