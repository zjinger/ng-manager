import { asObject } from "../../utils/config-utils";

export interface TsConfigInheritanceItem {
  filePath: string;
  exists: boolean;
}

export interface TsConfigViewModel {
  file: {
    path: string;
    extends?: string;
  };

  rawCompilerOptions: Record<string, unknown>;
  resolvedCompilerOptions?: Record<string, unknown>;
  include?: string[];
  exclude?: string[];
  references?: Array<{ path: string }>;
  inheritance: TsConfigInheritanceItem[];
}

function asStringArray(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) {
    return undefined;
  }
  return input.filter((item): item is string => typeof item === "string");
}

function asReferences(input: unknown): Array<{ path: string }> | undefined {
  if (!Array.isArray(input)) {
    return undefined;
  }
  return input
    .map((item) =>
      typeof item === "object" && item !== null && typeof (item as { path?: unknown }).path === "string"
        ? { path: (item as { path: string }).path }
        : undefined
    )
    .filter((item): item is { path: string } => Boolean(item));
}

import type { ResolvedTsConfig } from "./tsconfig-extends";

export function buildTsConfigViewModel(resolved: ResolvedTsConfig): TsConfigViewModel {
  const raw = asObject(resolved.raw);
  const merged = asObject(resolved.resolved);

  return {
    file: {
      path: resolved.filePath,
      extends: typeof raw.extends === "string" ? raw.extends : undefined
    },
    rawCompilerOptions: asObject(raw.compilerOptions),
    resolvedCompilerOptions: asObject(merged.compilerOptions),
    include: asStringArray(raw.include),
    exclude: asStringArray(raw.exclude),
    references: asReferences(raw.references),
    inheritance: resolved.inheritance
  };
}
