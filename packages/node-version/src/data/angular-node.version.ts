import { CoreError, CoreErrorCodes } from '@yinuo-ngm/errors';

interface AngularNodeVersion {
  angularVersion: number;
  supportedNodeRange: string;
}

const ANGULAR_NODE_VERSIONS: AngularNodeVersion[] = [
  { angularVersion: 21, supportedNodeRange: '^20.19.0 || ^22.12.0 || ^24.0.0' },
  { angularVersion: 20, supportedNodeRange: '^20.19.0 || ^22.12.0 || ^24.0.0' },
  { angularVersion: 19, supportedNodeRange: '^18.19.1 || ^20.11.1 || ^22.0.0' },
  { angularVersion: 18, supportedNodeRange: '^18.19.1 || ^20.11.1 || ^22.0.0' },
  { angularVersion: 17, supportedNodeRange: '^18.13.0 || ^20.9.0' },
  { angularVersion: 16, supportedNodeRange: '^16.14.0 || ^18.10.0' },
  { angularVersion: 15, supportedNodeRange: '^14.20.0 || ^16.13.0 || ^18.10.0' },
  { angularVersion: 14, supportedNodeRange: '^14.15.0 || ^16.10.0' },
  { angularVersion: 13, supportedNodeRange: '^12.20.0 || ^14.15.0 || ^16.10.0' },
  { angularVersion: 12, supportedNodeRange: '^12.14.0 || ^14.15.0 || ^16.10.0' },
  { angularVersion: 11, supportedNodeRange: '^10.13.0 || ^12.11.0' },
  { angularVersion: 10, supportedNodeRange: '^10.13.0 || ^12.11.0' },
];

export function getEnginesByAngular(ngVersion: number): { node: string } {
  const config = ANGULAR_NODE_VERSIONS.find(v => v.angularVersion === ngVersion);
  if (!config) {
    throw new CoreError(CoreErrorCodes.INVALID_NAME, `不支持的 Angular 版本: ${ngVersion}`);
  }
  return { node: config.supportedNodeRange };
}

export { ANGULAR_NODE_VERSIONS };
