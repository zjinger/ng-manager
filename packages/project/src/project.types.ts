import { ErrorCode } from "@yinuo-ngm/errors";
import { PackageManager, ProjectFramework, ProjectMeta } from "./project.meta";

export interface Project {
    id: string;
    name: string;
    root: string;
    createdAt: number;
    updatedAt: number;
    scripts?: Record<string, string>;
    packageManager?: PackageManager;
    framework?: ProjectFramework;
    env?: Record<string, string>;
    isFavorite?: boolean;
    lastOpened?: number;
    repoUrl?: string;
    repoPageUrl?: string;
    assets?: ProjectAssets;
}

export interface CreateProjectInput {
    name: string;
    root: string;
    scripts?: Project["scripts"];
    env?: Record<string, string>;
}

export interface CheckRootResult {
    ok: boolean;
    root: string;
    exists: boolean;
    isDir: boolean;
    alreadyRegistered: boolean;
    message?: string;
}

export interface ImportCheckResult {
    ok: boolean;
    root: string;
    code?: ErrorCode;
    reason?: string;
    detect?: DetectResult;
    warnings?: string[];
    meta?: ProjectMeta;
}

export interface DetectResult {
    framework?: ProjectFramework;
    hasPackageJson?: boolean;
    scripts?: string[];
    scriptsCount?: number;
    recommendedScript?: string;
    lockFile?: PackageManager;
    hasGit?: boolean;
    hasMakefile?: boolean;
    hasDockerCompose?: boolean;
}

export interface ProjectAssetSourceSvn {
    kind: "svn";
    id: string;
    label: string;
    url: string;
    localDir?: string;
    mode: "checkout" | "export" | "manual";
}

export interface ProjectAssets {
    iconsSvn?: ProjectAssetSourceSvn;
    cutImageSvn?: ProjectAssetSourceSvn;
}
