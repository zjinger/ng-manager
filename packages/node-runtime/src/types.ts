export type NodeRuntimeType = "system" | "managed" | "custom";

export type NodeRuntimePackageManager = "npm" | "pnpm" | "yarn";

export interface NodeRuntimeConfig {
  type: NodeRuntimeType;
  name?: string;
  version?: string;
  nodePath?: string;
  packageManager?: NodeRuntimePackageManager;
}

export interface NodeRuntimeRecord {
  id: string;
  name: string;
  version: string;
  platform: NodeJS.Platform | string;
  arch: NodeJS.Architecture | string;
  rootDir: string;
  nodePath: string;
  npmPath?: string;
  npxPath?: string;
  pnpmPath?: string;
  yarnPath?: string;
  npmCliPath?: string;
  npxCliPath?: string;
  source?: "registry" | "nvm-windows" | "system" | "custom";
}

export interface ResolvedNodeRuntime {
  type: NodeRuntimeType;
  name?: string;
  version: string;
  packageManager: NodeRuntimePackageManager;
  rootDir: string;
  binDir: string;
  nodePath: string;
  npmPath?: string;
  npxPath?: string;
  pnpmPath?: string;
  yarnPath?: string;
  npmCliPath?: string;
  npxCliPath?: string;
  env: Record<string, string>;
  source?: NodeRuntimeRecord["source"];
  record?: NodeRuntimeRecord;
}

export interface ResolvedRuntimeCommand {
  command: string;
  args: string[];
  cwd?: string;
  env: Record<string, string>;
  shell: boolean;
  displayCommand: string;
}

export interface NodeRuntimeTestResult {
  ok: boolean;
  nodeVersion?: string;
  npmVersion?: string;
  nodePath: string;
  npmLaunchCommand?: {
    command: string;
    args: string[];
  };
  errors: string[];
}

export interface NodeRuntimeServiceOptions {
  dataDir: string;
  registryPath?: string;
  baseEnv?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}

export interface ResolveRuntimeCommandOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export interface RuntimeEnvOptions {
  baseEnv?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  extraEnv?: Record<string, string | undefined>;
}

export interface NodeRuntimeService {
  listRuntimes(): Promise<NodeRuntimeRecord[]>;
  resolveRuntime(config?: NodeRuntimeConfig): Promise<ResolvedNodeRuntime>;
  buildRuntimeEnv(runtime: ResolvedNodeRuntime, extraEnv?: Record<string, string | undefined>): Record<string, string>;
  resolveCommand(commandLine: string, runtime: ResolvedNodeRuntime, options?: ResolveRuntimeCommandOptions): ResolvedRuntimeCommand;
  testRuntime(configOrRuntime: NodeRuntimeConfig | ResolvedNodeRuntime): Promise<NodeRuntimeTestResult>;
}
