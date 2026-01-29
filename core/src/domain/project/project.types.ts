import { ErrorCode } from "../../common/errors";
import { PackageManager, ProjectFramework, ProjectMeta } from "./project.meta";

export interface Project {
    id: string;
    name: string;
    root: string;            // 工程根目录
    createdAt: number;
    updatedAt: number;
    scripts?: Record<string, string>;
    packageManager?: PackageManager;
    framework?: ProjectFramework;
    // 可选：环境变量
    env?: Record<string, string>;
    // 收藏
    isFavorite?: boolean; // default false
    // 上次打开时间戳
    lastOpened?: number;
    // git 仓库url
    repoUrl?: string;
    // git 仓库网页地址
    repoPageUrl?: string;
}

export interface CreateProjectInput {
    name: string;
    root: string;
    scripts?: Project["scripts"];
    env?: Record<string, string>;
}

export interface CheckRootResult {
    ok: boolean; // 仅表示 rootPath 合法且可解析
    root: string; // normalize后的绝对路径
    exists: boolean;
    isDir: boolean;
    alreadyRegistered: boolean;
    message?: string;
}

export interface ImportCheckResult {
    ok: boolean;        // 是否允许导入（hard）
    root: string;
    code?: ErrorCode;
    reason?: string;    // hard fail
    detect?: DetectResult;
    warnings?: string[]; // soft
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