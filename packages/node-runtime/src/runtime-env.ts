import * as path from "node:path";
import type { ResolvedNodeRuntime, RuntimeEnvOptions } from "./types";
import { getPathEnvKey, prependPathSegments, toStringEnv } from "./path-utils";

function getNpmBinCandidates(runtime: ResolvedNodeRuntime): string[] {
  const candidates = [
    path.join(runtime.rootDir, "node_modules", "npm", "bin"),
    path.join(runtime.rootDir, "node_modules", ".bin"),
  ];
  if (process.platform !== "win32") {
    candidates.push(path.join(runtime.rootDir, "bin"));
  }
  return candidates;
}

export function buildRuntimeEnv(
  runtime: ResolvedNodeRuntime,
  options: RuntimeEnvOptions = {}
): Record<string, string> {
  const base = toStringEnv(options.baseEnv || process.env);
  const extra = toStringEnv(options.extraEnv || {});
  const merged = { ...base, ...extra };
  const pathKey = getPathEnvKey(merged);
  const withPath = prependPathSegments(merged, [
    runtime.binDir,
    ...getNpmBinCandidates(runtime),
  ]);

  return {
    ...withPath,
    [pathKey]: withPath[pathKey] || "",
    NODE_OPTIONS: "",
    NGM_NODE_RUNTIME: runtime.nodePath,
    NGM_NODE_VERSION: runtime.version,
    NGM_NODE_RUNTIME_TYPE: runtime.type,
  };
}
