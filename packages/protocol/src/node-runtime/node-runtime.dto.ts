export type NodeRuntimeTypeDto = "system" | "managed" | "custom";

export type NodeRuntimePackageManagerDto = "npm" | "pnpm" | "yarn";

export interface NodeRuntimeConfigDto {
    type: NodeRuntimeTypeDto;
    name?: string;
    version?: string;
    nodePath?: string;
    packageManager?: NodeRuntimePackageManagerDto;
}

export interface NodeRuntimeRecordDto {
    id: string;
    name: string;
    version: string;
    platform: string;
    arch: string;
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

export interface ResolvedNodeRuntimeDto {
    type: NodeRuntimeTypeDto;
    name?: string;
    version: string;
    packageManager: NodeRuntimePackageManagerDto;
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
    source?: NodeRuntimeRecordDto["source"];
}

export interface ResolvedRuntimeCommandDto {
    command: string;
    args: string[];
    cwd?: string;
    env: Record<string, string>;
    shell: boolean;
    displayCommand: string;
}

export interface NodeRuntimeTestResultDto {
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
