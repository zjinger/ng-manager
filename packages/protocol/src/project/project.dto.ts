export type ProjectFrameworkDto =
    | "angular"
    | "vue"
    | "react"
    | "node"
    | "unknown";

export type PackageManagerDto = "npm" | "pnpm" | "yarn" | "unknown" | "auto";

export interface ProjectAssetSourceSvnDto {
    kind: "svn";
    id?: string;
    label: string;
    url: string;
    localDir?: string;
    mode: "checkout" | "export" | "manual";
}

export interface ProjectAssetsDto {
    iconsSvn?: ProjectAssetSourceSvnDto;
    cutImageSvn?: ProjectAssetSourceSvnDto;
}

export interface ProjectDto {
    id: string;
    name: string;
    description?: string;
    root: string;
    createdAt: number;
    updatedAt: number;
    scripts?: Record<string, string>;
    packageManager?: PackageManagerDto;
    framework?: ProjectFrameworkDto;
    env?: Record<string, string>;
    isFavorite?: boolean;
    lastOpened?: number;
    repoUrl?: string;
    repoPageUrl?: string;
    assets?: ProjectAssetsDto;
}

export interface CheckRootResultDto {
    ok: boolean;
    root: string;
    exists: boolean;
    isDir: boolean;
    alreadyRegistered: boolean;
    message?: string;
}

export interface DetectResultDto {
    framework?: ProjectFrameworkDto;
    hasPackageJson?: boolean;
    scripts?: string[];
    scriptsCount?: number;
    recommendedScript?: string;
    lockFile?: PackageManagerDto;
    hasGit?: boolean;
    hasMakefile?: boolean;
    hasDockerCompose?: boolean;
}

export interface ImportCheckResultDto {
    ok: boolean;
    root: string;
    code?: ErrorCode;
    reason?: string;
    detect?: DetectResultDto;
    warnings?: string[];
}
import type { ErrorCode } from "@yinuo-ngm/errors";
