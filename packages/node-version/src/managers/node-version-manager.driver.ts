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

  /** 切换到指定 Node 版本（若未安装则先安装）。
   *
   *  与 install 的区别：use 会将版本设为当前激活版本（nvm use / volta pin）。
   *  - Volta：install node@x.y.z 已包含 pin 语义，use 等同于 install。
   *  - NVM-Windows / NVM-Unix：install 与 use 是两件事，use() 内部会先 install 再 activate。
   *  未安装时调用 use() 会失败（NVM 不自动装，Volta 由其自身行为决定）。
   */
  use(version: string): Promise<void>;

  /** 获取当前激活的 Node 版本，无法检测时返回 null。 */
  getCurrentVersion(): Promise<NormalisedVersion | null>;

  /** 列出所有已安装的 Node 版本。 */
  listInstalled(): Promise<InstalledVersion[]>;
}
