/**
 * Angular <-> Node.js 版本对应配置（10 ~ 21最新）
 * @See https://angular.dev/reference/versions
 */
interface AngularNodeVersion {
  /** Angular 版本号 */
  angularVersion: number;
  /** 支持的 Node.js 版本范围 */
  supportedNodeRange: string;
}

const ANGULAR_NODE_VERSIONS: AngularNodeVersion[] = [
  {
    angularVersion: 21,
    supportedNodeRange: '^20.19.0 || ^22.12.0 || ^24.0.0',
  },
  {
    angularVersion: 20,
    supportedNodeRange: '^20.19.0 || ^22.12.0 || ^24.0.0',
  },
  {
    angularVersion: 19,
    supportedNodeRange: '^18.19.1 || ^20.11.1 || ^22.0.0',
  },
  {
    angularVersion: 18,
    supportedNodeRange: '^18.19.1 || ^20.11.1 || ^22.0.0',
  },
  {
    angularVersion: 17,
    supportedNodeRange: '^18.13.0 || ^20.9.0',
  },
  {
    angularVersion: 16,
    supportedNodeRange: '^16.14.0 || ^18.10.0',
  },
  {
    angularVersion: 15,
    supportedNodeRange: '^14.20.0 || ^16.13.0 || ^18.10.0',
  },
  {
    angularVersion: 14,
    supportedNodeRange: '^14.15.0 || ^16.10.0',
  },
  {
    angularVersion: 13,
    supportedNodeRange: '^12.20.0 || ^14.15.0 || ^16.10.0',
  },
  {
    angularVersion: 12,
    // ^16.10.0 官方未说明但实际测试 16.10.0可以
    supportedNodeRange: '^12.14.0 || ^14.15.0 || ^16.10.0',
  },
  {
    angularVersion: 11,
    supportedNodeRange: '^10.13.0 || ^12.11.0',
  },
  {
    angularVersion: 10,
    supportedNodeRange: '^10.13.0 || ^12.11.0',
  },
];

/** 根据 Angular 主版本获取完整配置 */
function getAngularVersionConfig(ngVersion: number) {
  const config = ANGULAR_NODE_VERSIONS.find(v => v.angularVersion === ngVersion);
  if (!config) throw new Error(`不支持的 Angular 版本: ${ngVersion}`);
  return config;
}

/** 获取 engines 配置（可直接用于 package.json） */
export function getEnginesByAngular(ngVersion: number) {
  const { supportedNodeRange } = getAngularVersionConfig(ngVersion);
  return { node: supportedNodeRange };
}
