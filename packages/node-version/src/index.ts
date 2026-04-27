// 公开 API
export { NodeVersionService, NodeVersionInfo, ProjectNodeRequirement, VersionManager } from './node-version.service';
export { ManagerKind, ProjectType, ManagerDescriptor, NormalisedVersion, InstalledVersion } from './node-version.types';
export { INodeVersionManagerDriver } from './managers/node-version-manager.driver';

// 数据表
export { getEnginesByAngular, ANGULAR_NODE_VERSIONS } from './data/angular-node.version';
export { getEnginesByVue, VUE_NODE_VERSIONS } from './data/vue-node.version';

// 项目 Node 版本需求
export { detectFramework, DetectedFramework } from './project-requirement/framework.detector';
export { readPackageJson, writePackageJsonField } from './project-requirement/package-json.reader';
export { detectProjectRequirement } from './project-requirement/project-requirement.detector';

// 工具函数
export { satisfiesVersion, findBestMatchingVersion, compareVersions } from './node-version.utils';

// 工厂函数
export { createNodeVersionService } from './infra/node-version.composer';

export type { SystemLogService } from '@yinuo-ngm/logger';
