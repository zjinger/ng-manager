import * as fs from "node:fs";
import { promises as fsp } from "node:fs";
import * as path from "node:path";
import type { NodeRuntimeRecord, NodeRuntimeServiceOptions } from "./types";
import {
  dirExists,
  getVersionFromDirName,
  resolveNodePathFromRoot,
  resolveNpmCliPath,
  resolveNpxCliPath,
  resolveToolPathFromRoot,
} from "./path-utils";
import { normalizeRuntimeRecord } from "./validators";

interface RegistryFileObject {
  items?: Partial<NodeRuntimeRecord>[];
  runtimes?: Partial<NodeRuntimeRecord>[];
}

function defaultRegistryPath(dataDir: string): string {
  return path.join(dataDir, "runtimes", "node", "registry.json");
}

function getEnvPath(
  env: NodeRuntimeServiceOptions["baseEnv"],
  key: string,
  fallback?: string
): string | undefined {
  const value = env?.[key] || process.env[key] || fallback;
  return value ? String(value) : undefined;
}

export class NodeRuntimeRegistry {
  readonly registryPath: string;
  private readonly baseEnv: NodeRuntimeServiceOptions["baseEnv"];

  constructor(private readonly dataDir: string, options: Pick<NodeRuntimeServiceOptions, "registryPath" | "baseEnv"> = {}) {
    this.registryPath = options.registryPath || defaultRegistryPath(dataDir);
    this.baseEnv = options.baseEnv;
  }

  async list(): Promise<NodeRuntimeRecord[]> {
    const records = [
      ...(await this.readRegistryFile()),
      ...this.detectNvmWindowsRuntimes(),
    ];
    const deduped = new Map<string, NodeRuntimeRecord>();
    for (const record of records) {
      const key = `${record.nodePath.toLowerCase()}::${record.version}`;
      if (!deduped.has(key)) deduped.set(key, record);
    }
    return [...deduped.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  }

  private async readRegistryFile(): Promise<NodeRuntimeRecord[]> {
    let raw: string;
    try {
      raw = await fsp.readFile(this.registryPath, "utf8");
    } catch (error: any) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }

    const parsed = JSON.parse(raw) as Partial<NodeRuntimeRecord>[] | RegistryFileObject;
    const list = Array.isArray(parsed) ? parsed : parsed.items || parsed.runtimes || [];
    return list
      .map((item) => normalizeRuntimeRecord({ ...item, source: item.source || "registry" }))
      .filter((item): item is NodeRuntimeRecord => !!item);
  }

  private detectNvmWindowsRuntimes(): NodeRuntimeRecord[] {
    if (process.platform !== "win32") return [];

    const programFiles = getEnvPath(this.baseEnv, "ProgramFiles", "C:\\Program Files");
    const programData = getEnvPath(this.baseEnv, "ProgramData", "C:\\ProgramData");
    const candidates = [
      getEnvPath(this.baseEnv, "NVM_HOME"),
      path.join(getEnvPath(this.baseEnv, "LOCALAPPDATA") || "", "nvm"),
      path.join(getEnvPath(this.baseEnv, "APPDATA") || "", "nvm"),
      programFiles ? path.join(programFiles, "nvm") : undefined,
      programData ? path.join(programData, "nvm") : undefined,
    ].filter((item): item is string => !!item);

    const records: NodeRuntimeRecord[] = [];
    const visited = new Set<string>();

    for (const nvmRoot of candidates) {
      if (!dirExists(nvmRoot)) continue;
      const normalizedRoot = path.resolve(nvmRoot).toLowerCase();
      if (visited.has(normalizedRoot)) continue;
      visited.add(normalizedRoot);

      let entries: string[] = [];
      try {
        entries = fs.readdirSync(nvmRoot);
      } catch {
        continue;
      }

      for (const entry of entries) {
        const version = getVersionFromDirName(entry);
        if (!version) continue;
        const rootDir = path.join(nvmRoot, entry);
        const nodePath = resolveNodePathFromRoot(rootDir);
        if (!nodePath) continue;

        const record = normalizeRuntimeRecord({
          id: `nvm-windows:${version}`,
          name: `node-${version.split(".")[0]}`,
          version,
          platform: "win32",
          arch: process.arch,
          rootDir,
          nodePath,
          npmPath: resolveToolPathFromRoot(rootDir, "npm"),
          npxPath: resolveToolPathFromRoot(rootDir, "npx"),
          pnpmPath: resolveToolPathFromRoot(rootDir, "pnpm"),
          yarnPath: resolveToolPathFromRoot(rootDir, "yarn"),
          npmCliPath: resolveNpmCliPath(rootDir),
          npxCliPath: resolveNpxCliPath(rootDir),
          source: "nvm-windows",
        });
        if (record) records.push(record);
      }
    }

    return records;
  }
}

export function createNodeRuntimeRegistry(options: NodeRuntimeServiceOptions): NodeRuntimeRegistry {
  return new NodeRuntimeRegistry(options.dataDir, options);
}
