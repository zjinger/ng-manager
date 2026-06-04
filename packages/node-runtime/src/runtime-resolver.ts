import { execFile } from "node:child_process";
import * as path from "node:path";
import { resolveRuntimeCommand } from "./command-resolver";
import { buildRuntimeEnv } from "./runtime-env";
import { NodeRuntimeRegistry } from "./runtime-registry";
import { testResolvedRuntime } from "./runtime-tester";
import type {
  NodeRuntimeConfig,
  NodeRuntimePackageManager,
  NodeRuntimeRecord,
  NodeRuntimeService,
  NodeRuntimeServiceOptions,
  NodeRuntimeTestResult,
  ResolveRuntimeCommandOptions,
  ResolvedNodeRuntime,
  ResolvedRuntimeCommand,
} from "./types";
import {
  fileExists,
  findOnPath,
  getRuntimeBinDir,
  inferRootDirFromNodePath,
  normalizeRuntimeVersion,
  resolveNpmCliPath,
  resolveNpxCliPath,
  resolveToolPathFromRoot,
} from "./path-utils";
import { assertValidRuntimeConfig, normalizeRuntimeRecord } from "./validators";

function execVersion(file: string, args: string[], env: NodeRuntimeServiceOptions["baseEnv"]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { env: { ...process.env, ...(env || {}) }, windowsHide: true, timeout: 10_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(String(stdout || stderr).trim());
      }
    );
  });
}

function defaultRuntimeConfig(config?: NodeRuntimeConfig): NodeRuntimeConfig {
  return config || { type: "system", packageManager: "npm" };
}

function getPackageManager(config?: NodeRuntimeConfig): NodeRuntimePackageManager {
  return config?.packageManager || "npm";
}

function matchesManagedRuntime(record: NodeRuntimeRecord, config: NodeRuntimeConfig): boolean {
  if (config.name && record.name === config.name) return true;
  if (config.version && normalizeRuntimeVersion(record.version) === normalizeRuntimeVersion(config.version)) return true;
  return false;
}

export class NodeRuntimeResolver implements NodeRuntimeService {
  private readonly registry: NodeRuntimeRegistry;
  private readonly baseEnv: NodeRuntimeServiceOptions["baseEnv"];

  constructor(private readonly options: NodeRuntimeServiceOptions) {
    this.registry = new NodeRuntimeRegistry(options.dataDir, options);
    this.baseEnv = options.baseEnv;
  }

  async listRuntimes(): Promise<NodeRuntimeRecord[]> {
    return this.registry.list();
  }

  async resolveRuntime(configInput?: NodeRuntimeConfig): Promise<ResolvedNodeRuntime> {
    const config = defaultRuntimeConfig(configInput);
    assertValidRuntimeConfig(config);

    if (config.type === "managed") {
      return this.resolveManagedRuntime(config);
    }
    if (config.type === "custom") {
      return this.resolveCustomRuntime(config);
    }
    return this.resolveSystemRuntime(config);
  }

  buildRuntimeEnv(runtime: ResolvedNodeRuntime, extraEnv?: Record<string, string | undefined>): Record<string, string> {
    return buildRuntimeEnv(runtime, { baseEnv: this.baseEnv, extraEnv });
  }

  resolveCommand(commandLine: string, runtime: ResolvedNodeRuntime, options?: ResolveRuntimeCommandOptions): ResolvedRuntimeCommand {
    return resolveRuntimeCommand(commandLine, runtime, options);
  }

  async testRuntime(configOrRuntime: NodeRuntimeConfig | ResolvedNodeRuntime): Promise<NodeRuntimeTestResult> {
    const runtime = "nodePath" in configOrRuntime && "env" in configOrRuntime
      ? configOrRuntime
      : await this.resolveRuntime(configOrRuntime as NodeRuntimeConfig);
    return testResolvedRuntime(runtime);
  }

  private async resolveManagedRuntime(config: NodeRuntimeConfig): Promise<ResolvedNodeRuntime> {
    const records = await this.registry.list();
    const record = records.find((item) => matchesManagedRuntime(item, config));
    if (!record) {
      throw new Error(`Node runtime not found: ${config.name || config.version}`);
    }
    return this.fromRecord(record, config);
  }

  private async resolveCustomRuntime(config: NodeRuntimeConfig): Promise<ResolvedNodeRuntime> {
    const nodePath = config.nodePath!;
    if (!fileExists(nodePath)) {
      throw new Error("Node executable not found");
    }

    const rootDir = inferRootDirFromNodePath(nodePath);
    let version = config.version ? normalizeRuntimeVersion(config.version) : "";
    if (!version) {
      try {
        version = normalizeRuntimeVersion(await execVersion(nodePath, ["-v"], this.baseEnv));
      } catch {
        version = "unknown";
      }
    }

    const record = normalizeRuntimeRecord({
      id: `custom:${nodePath}`,
      name: config.name || "custom-node",
      version,
      platform: process.platform,
      arch: process.arch,
      rootDir,
      nodePath,
      npmPath: resolveToolPathFromRoot(rootDir, "npm"),
      npxPath: resolveToolPathFromRoot(rootDir, "npx"),
      pnpmPath: resolveToolPathFromRoot(rootDir, "pnpm"),
      yarnPath: resolveToolPathFromRoot(rootDir, "yarn"),
      npmCliPath: resolveNpmCliPath(rootDir),
      npxCliPath: resolveNpxCliPath(rootDir),
      source: "custom",
    });
    if (!record) throw new Error("Node executable not found");
    return this.fromRecord(record, config);
  }

  private async resolveSystemRuntime(config: NodeRuntimeConfig): Promise<ResolvedNodeRuntime> {
    const nodePath = findOnPath("node", this.baseEnv) || process.execPath;
    const rootDir = inferRootDirFromNodePath(nodePath);
    let version = config.version ? normalizeRuntimeVersion(config.version) : "";
    if (!version) {
      try {
        version = normalizeRuntimeVersion(await execVersion(nodePath, ["-v"], this.baseEnv));
      } catch {
        version = normalizeRuntimeVersion(process.version);
      }
    }

    const record: NodeRuntimeRecord = {
      id: "system",
      name: "system",
      version,
      platform: process.platform,
      arch: process.arch,
      rootDir,
      nodePath,
      npmPath: findOnPath("npm", this.baseEnv) || resolveToolPathFromRoot(rootDir, "npm"),
      npxPath: findOnPath("npx", this.baseEnv) || resolveToolPathFromRoot(rootDir, "npx"),
      pnpmPath: findOnPath("pnpm", this.baseEnv) || resolveToolPathFromRoot(rootDir, "pnpm"),
      yarnPath: findOnPath("yarn", this.baseEnv) || resolveToolPathFromRoot(rootDir, "yarn"),
      npmCliPath: resolveNpmCliPath(rootDir),
      npxCliPath: resolveNpxCliPath(rootDir),
      source: "system",
    };
    return this.fromRecord(record, config);
  }

  private fromRecord(record: NodeRuntimeRecord, config: NodeRuntimeConfig): ResolvedNodeRuntime {
    const binDir = getRuntimeBinDir(record.rootDir, record.nodePath);
    const runtime: ResolvedNodeRuntime = {
      type: config.type,
      name: record.name,
      version: normalizeRuntimeVersion(record.version),
      packageManager: getPackageManager(config),
      rootDir: path.resolve(record.rootDir),
      binDir,
      nodePath: record.nodePath,
      npmPath: record.npmPath,
      npxPath: record.npxPath,
      pnpmPath: record.pnpmPath,
      yarnPath: record.yarnPath,
      npmCliPath: record.npmCliPath,
      npxCliPath: record.npxCliPath,
      env: {},
      source: record.source,
      record,
    };
    runtime.env = buildRuntimeEnv(runtime, { baseEnv: this.baseEnv });
    return runtime;
  }
}

export function createNodeRuntimeService(options: NodeRuntimeServiceOptions): NodeRuntimeService {
  return new NodeRuntimeResolver(options);
}
