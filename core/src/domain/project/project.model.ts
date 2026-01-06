import { ErrorCode } from "../../common/errors";
import { PackageManager, ProjectFramework } from "./project.meta";

export interface Project {
    id: string;
    name: string;
    root: string;            // 工程根目录
    createdAt: number;
    updatedAt: number;
    scripts?: Record<string, string>;
    // 可选：环境变量
    env?: Record<string, string>;
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