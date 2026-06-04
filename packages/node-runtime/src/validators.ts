import type { NodeRuntimeConfig, NodeRuntimeRecord } from "./types";
import { fileExists, normalizeRuntimeVersion } from "./path-utils";

export function assertValidRuntimeConfig(config: NodeRuntimeConfig): void {
  if (!config || !["system", "managed", "custom"].includes(config.type)) {
    throw new Error("Invalid Node runtime config");
  }
  if (config.type === "custom" && !config.nodePath) {
    throw new Error("Node executable not found");
  }
  if (config.type === "managed" && !config.name && !config.version) {
    throw new Error("Node runtime not found: managed");
  }
}

export function normalizeRuntimeRecord(record: Partial<NodeRuntimeRecord>): NodeRuntimeRecord | null {
  if (!record.rootDir || !record.nodePath || !fileExists(record.nodePath)) return null;
  const version = normalizeRuntimeVersion(record.version || "");
  if (!version) return null;

  const name = record.name || `node-${version.split(".")[0]}`;
  return {
    id: record.id || `${record.source || "registry"}:${name}:${version}`,
    name,
    version,
    platform: record.platform || process.platform,
    arch: record.arch || process.arch,
    rootDir: record.rootDir,
    nodePath: record.nodePath,
    npmPath: record.npmPath,
    npxPath: record.npxPath,
    pnpmPath: record.pnpmPath,
    yarnPath: record.yarnPath,
    npmCliPath: record.npmCliPath,
    npxCliPath: record.npxCliPath,
    source: record.source,
  };
}
