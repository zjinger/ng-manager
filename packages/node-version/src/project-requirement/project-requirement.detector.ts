import { ProjectNodeRequirement } from '../node-version.service';
import { detectFramework } from './framework.detector';
import { readPackageJson } from './package-json.reader';
import { satisfiesVersion, findBestMatchingVersion } from '../node-version.utils';
import { getEnginesByAngular } from '../data/angular-node.version';
import { getEnginesByVue } from '../data/vue-node.version';
import { InstalledVersion, ProjectType } from '../managers/manager.types';

export interface DetectRequirementOptions {
  projectPath: string;
  /** Server 进程当前的 Node 版本（normalised 'v20.19.0'），非 project 的 Volta 托管版本 */
  currentVersion: string | null;
  /** 所有已安装版本 */
  available: InstalledVersion[];
}

/** 规范化 Volta package.json 版本（可能带 v 前缀） */
function normaliseVoltaVersion(v: string): string {
  return v.startsWith('v') ? v : `v${v}`;
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

  // Volta 配置优先（精确版本锁定）
  const voltaVersion: string | null = (pkg.volta?.node as string | undefined) ?? null;
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

  // 已安装版本列表（normalised）
  const availableVersions = options.available.map(v => v.version);

  let satisfiedBy: string | null = null;
  let isMatch = false;

  if (voltaVersion) {
    // Voltaproject：requiredVersion 为 Volta 锁定的精确版本
    const normalisedVolta = normaliseVoltaVersion(voltaVersion);

    // 检查 server 当前 Node 是否满足项目的 Volta 要求
    if (currentVersion && satisfiesVersion(currentVersion, normalisedVolta)) {
      isMatch = true;
      satisfiedBy = currentVersion;
    } else {
      // server 版本不满足，在已安装列表中寻找满足 Volta 要求的版本
      const match = availableVersions.find(v => satisfiesVersion(v, normalisedVolta));
      if (match) {
        satisfiedBy = match;
      }
    }
  } else if (requiredVersion) {
    // engines 或框架推断版本：允许 semver 范围
    if (currentVersion && satisfiesVersion(currentVersion, requiredVersion)) {
      isMatch = true;
      satisfiedBy = currentVersion;
    } else {
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
