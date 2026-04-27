import { NormalisedVersion, InstalledVersion } from './manager.types';

export type { NormalisedVersion, InstalledVersion };

/**
 * 版本管理器的抽象接口（Volta / NVM-Windows / NVM-Unix / none）。
 * 各平台 driver 实现此接口。
 */
export interface INodeVersionManagerDriver {
  /** 对用户展示的简短名称 */
  readonly name: string;

  /** 安装指定 Node 版本。 */
  install(version: string): Promise<void>;

  /** 卸载指定 Node 版本。 */
  uninstall(version: string): Promise<void>;

  /** 获取当前激活的 Node 版本，无法检测时返回 null。 */
  getCurrentVersion(): Promise<NormalisedVersion | null>;

  /** 列出所有已安装的 Node 版本。 */
  listInstalled(): Promise<InstalledVersion[]>;
}
