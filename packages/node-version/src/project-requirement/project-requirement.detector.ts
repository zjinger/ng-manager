import { ProjectNodeRequirement } from '../node-version.service';
import { detectFramework } from './framework.detector';
import { readPackageJson } from './package-json.reader';
import { satisfiesVersion, findBestMatchingVersion } from '../node-version.utils';
import { getEnginesByAngular } from '../data/angular-node.version';
import { getEnginesByVue } from '../data/vue-node.version';
import { InstalledVersion, ProjectType } from '../managers/manager.types';

export interface DetectRequirementOptions {
  projectPath: string;
  /** Current normalised Node version (e.g. 'v20.19.0') */
  currentVersion: string | null;
  /** All installed versions from the manager driver */
  available: InstalledVersion[];
}

export async function detectProjectRequirement(
  options: DetectRequirementOptions,
): Promise<ProjectNodeRequirement> {
  const { projectPath, currentVersion } = options;
  const { pkg, error } = await readPackageJson(projectPath);

  if (!pkg || error) {
    return {
      projectPath,
      requiredVersion: null,
      voltaConfig: null,
      satisfiedBy: null,
      isMatch: false,
      hasEnginesConfig: false,
    };
  }

  // Volta 配置优先
  const voltaVersion: string | null = pkg.volta?.node ?? null;

  // engines.node 字段
  const enginesNode: string | null = pkg.engines?.node ?? null;

  // 框架推断的 Node 版本需求
  const framework = detectFramework(pkg);
  let inferredVersion: string | null = null;
  if (framework.type === ProjectType.Angular && framework.majorVersion !== null) {
    inferredVersion = getEnginesByAngular(framework.majorVersion).node;
  } else if (framework.type === ProjectType.Vue && framework.majorVersion !== null) {
    inferredVersion = getEnginesByVue(framework.majorVersion).node;
  }

  const requiredVersion = enginesNode ?? inferredVersion;
  const hasEnginesConfig = enginesNode !== null;

  let satisfiedBy: string | null = null;
  let isMatch = false;

  if (voltaVersion && currentVersion) {
    // Volta 锁定精确版本
    isMatch = currentVersion === voltaVersion || currentVersion === `v${voltaVersion}`;
    if (isMatch) satisfiedBy = currentVersion;
  } else if (requiredVersion && currentVersion) {
    isMatch = satisfiesVersion(currentVersion, requiredVersion);
    if (isMatch) {
      satisfiedBy = currentVersion;
    } else {
      // 寻找满足条件的最佳可用版本
      const availableVersions = options.available.map(v => v.version);
      const match = findBestMatchingVersion(availableVersions, requiredVersion);
      if (match) satisfiedBy = match;
    }
  }

  return {
    projectPath,
    requiredVersion,
    voltaConfig: voltaVersion,
    satisfiedBy,
    isMatch,
    hasEnginesConfig,
  };
}
