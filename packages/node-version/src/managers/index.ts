export { ManagerKind, ProjectType, ManagerDescriptor, NormalisedVersion, InstalledVersion } from './manager.types';
export { detectManager } from './manager.detector';
export { INodeVersionManagerDriver } from './node-version-manager.driver';
export { VoltaDriver, createVoltaDriver } from './volta.driver';
export { NvmWindowsDriver, createNvmWindowsDriver } from './nvm-windows.driver';
export { NvmUnixDriver, createNvmUnixDriver } from './nvm-unix.driver';
export { NoneDriver } from './none.driver';
