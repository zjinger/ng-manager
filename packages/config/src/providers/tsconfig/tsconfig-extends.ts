import path from "node:path";
import { deepMerge, fileExists, readJsoncFile } from "@yinuo-ngm/shared";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import { asObject } from "../../utils/config-utils";

export interface ResolvedTsConfig {
  filePath: string;
  raw: Record<string, unknown>;
  resolved: Record<string, unknown>;
  inheritance: TsConfigInheritanceItem[];
}

export interface TsConfigInheritanceItem {
  filePath: string;
  exists: boolean;
}

interface WalkResult {
  raw: Record<string, unknown>;
  resolved: Record<string, unknown>;
  inheritance: TsConfigInheritanceItem[];
}

function mergeTsConfig(
  parentConfig: Record<string, unknown>,
  currentConfig: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...parentConfig, ...currentConfig };
  merged.compilerOptions = deepMerge(
    asObject(parentConfig.compilerOptions),
    asObject(currentConfig.compilerOptions)
  );

  for (const key of ["include", "exclude", "files", "references"] as const) {
    if (key in currentConfig) {
      merged[key] = currentConfig[key];
    } else if (key in parentConfig) {
      merged[key] = parentConfig[key];
    }
  }

  return merged;
}

function toDisplayPath(projectRoot: string, absPath: string): string {
  const root = path.resolve(projectRoot);
  const rel = path.relative(root, absPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return absPath.replace(/\\/g, "/");
  }
  return rel.replace(/\\/g, "/");
}

async function walkExtends(input: {
  projectRoot: string;
  absPath: string;
  maxDepth: number;
  depth: number;
  visited: Set<string>;
}): Promise<WalkResult> {
  const normalizedAbsPath = path.resolve(input.absPath);
  const displayPath = toDisplayPath(input.projectRoot, normalizedAbsPath);

  if (input.visited.has(normalizedAbsPath)) {
    throw new CoreError(
      CoreErrorCodes.CONFIG_READ_FAILED,
      `检测到 tsconfig extends 循环引用：${displayPath}`,
      { filePath: displayPath }
    );
  }

  if (input.depth > input.maxDepth) {
    throw new CoreError(
      CoreErrorCodes.CONFIG_READ_FAILED,
      `tsconfig extends 超过最大深度（${input.maxDepth}）：${displayPath}`,
      { filePath: displayPath }
    );
  }

  input.visited.add(normalizedAbsPath);
  const exists = await fileExists(normalizedAbsPath);

  if (!exists) {
    return {
      raw: {},
      resolved: {},
      inheritance: [{ filePath: displayPath, exists: false }]
    };
  }

  const current = await readJsoncFile<Record<string, unknown>>(normalizedAbsPath);
  const extendsValue = typeof current.extends === "string" ? current.extends : undefined;
  const inheritance: TsConfigInheritanceItem[] = [{ filePath: displayPath, exists: true }];

  if (!extendsValue) {
    return {
      raw: current,
      resolved: current,
      inheritance
    };
  }

  if (!extendsValue.startsWith(".") && !extendsValue.startsWith("/") && !extendsValue.startsWith("..")) {
    return {
      raw: current,
      resolved: current,
      inheritance: [
        ...inheritance,
        {
          filePath: extendsValue,
          exists: false
        }
      ]
    };
  }

  const parentCandidate = extendsValue.endsWith(".json")
    ? path.resolve(path.dirname(normalizedAbsPath), extendsValue)
    : path.resolve(path.dirname(normalizedAbsPath), `${extendsValue}.json`);

  const parent = await walkExtends({
    projectRoot: input.projectRoot,
    absPath: parentCandidate,
    maxDepth: input.maxDepth,
    depth: input.depth + 1,
    visited: input.visited
  });

  return {
    raw: current,
    resolved: mergeTsConfig(parent.resolved, current),
    inheritance: [...inheritance, ...parent.inheritance]
  };
}

export async function resolveTsconfigExtends(input: {
  projectRoot: string;
  absPath: string;
  maxDepth?: number;
}): Promise<ResolvedTsConfig> {
  const result = await walkExtends({
    projectRoot: input.projectRoot,
    absPath: input.absPath,
    maxDepth: input.maxDepth ?? 8,
    depth: 0,
    visited: new Set<string>()
  });

  return {
    filePath: toDisplayPath(input.projectRoot, input.absPath),
    raw: result.raw,
    resolved: result.resolved,
    inheritance: result.inheritance
  };
}
