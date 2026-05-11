import { readJsoncFile } from "@yinuo-ngm/shared";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { ConfigDocument } from "../../types/config-document";
import { resolveProjectFile } from "../../utils/config-path";
import { resolveTsConfigFilePath } from "./tsconfig.detector";
import { buildTsConfigSchema } from "./tsconfig.schema";
import { resolveTsconfigExtends } from "./tsconfig-extends";
import { buildTsConfigViewModel } from "./tsconfig.viewmodel";
import { asObject } from "../../utils/config-utils";

function getValueByPath(input: unknown, path: string): unknown {
  const segments = path
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean);
  let cursor: unknown = input;
  for (const segment of segments) {
    if (typeof cursor !== "object" || cursor === null || Array.isArray(cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function findSourcePath(
  inheritance: Array<{ filePath: string; exists: boolean; raw?: Record<string, unknown> }>,
  path: string
): string {
  for (const item of inheritance) {
    if (!item.exists || !item.raw) {
      continue;
    }
    if (getValueByPath(item.raw, path) !== undefined) {
      return item.filePath;
    }
  }
  return "(default)";
}

function buildTsconfigEffective(resolved: Awaited<ReturnType<typeof resolveTsconfigExtends>>) {
  const merged = asObject(resolved.resolved);
  const compilerOptions = asObject(merged.compilerOptions);
  const fields: Record<string, string> = {
    "/compilerOptions/target": "compilerOptions.target",
    "/compilerOptions/module": "compilerOptions.module",
    "/compilerOptions/moduleResolution": "compilerOptions.moduleResolution",
    "/compilerOptions/strict": "compilerOptions.strict",
    "/compilerOptions/skipLibCheck": "compilerOptions.skipLibCheck",
    "/compilerOptions/esModuleInterop": "compilerOptions.esModuleInterop",
    "/compilerOptions/baseUrl": "compilerOptions.baseUrl",
    "/compilerOptions/paths": "compilerOptions.paths",
    "/include": "include",
    "/exclude": "exclude",
    "/references": "references"
  };

  const values = {
    compilerOptions: {
      target: compilerOptions.target,
      module: compilerOptions.module,
      moduleResolution: compilerOptions.moduleResolution,
      strict: compilerOptions.strict,
      skipLibCheck: compilerOptions.skipLibCheck,
      esModuleInterop: compilerOptions.esModuleInterop,
      baseUrl: compilerOptions.baseUrl,
      paths: compilerOptions.paths
    },
    include: merged.include,
    exclude: merged.exclude,
    references: merged.references
  };

  const sources: Record<string, string> = {};
  for (const [path, key] of Object.entries(fields)) {
    sources[key] = findSourcePath(resolved.inheritance, path);
  }

  return { values, sources };
}

export async function readTsConfig(input: {
  projectRoot: string;
  filePath?: string;
}): Promise<ConfigDocument> {
  const filePath = await resolveTsConfigFilePath(input.projectRoot, input.filePath);
  const absPath = resolveProjectFile(input.projectRoot, filePath);

  try {
    const raw = await readJsoncFile<Record<string, unknown>>(absPath);
    const resolved = await resolveTsconfigExtends({
      projectRoot: input.projectRoot,
      absPath
    });
    const viewModel = buildTsConfigViewModel(resolved);
    const rawWithEffective: Record<string, unknown> = {
      ...raw,
      __ngmEffective: buildTsconfigEffective(resolved)
    };

    return {
      id: `tsconfig:${filePath}`,
      type: "tsconfig",
      title: "TypeScript",
      projectRoot: input.projectRoot,
      filePath,
      raw: rawWithEffective,
      viewModel,
      schema: buildTsConfigSchema()
    };
  } catch (error) {
    throw new CoreError(CoreErrorCodes.CONFIG_READ_FAILED, `配置解析失败：${absPath}`, {
      filePath: absPath,
      cause: error
    });
  }
}
