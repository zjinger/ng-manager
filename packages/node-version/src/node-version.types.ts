// Re-export shared types from managers
export {
  ManagerKind,
  ProjectType,
  ManagerDescriptor,
  NormalisedVersion,
  InstalledVersion,
} from './managers/manager.types';

// Public-facing service types
export { INodeVersionManagerDriver } from './managers/node-version-manager.driver';
