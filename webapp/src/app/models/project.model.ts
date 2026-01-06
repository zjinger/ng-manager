export type ProjectFramework =
    | "angular"
    | "vue"
    | "react"
    | "node"
    | "unknown";

export type PackageManager = "npm" | "pnpm" | "yarn" | "unknown" | "auto";

export interface Project {
    id: string;
    name: string;
    description?: string;    // 项目描述
    isFavorite?: boolean;  // 是否收藏
    root: string;            // 工程根目录
    createdAt: number;
    updatedAt: number;
    scripts?: Record<string, string>;
    // 可选：环境变量
    env?: Record<string, string>;
    lastOpened?: number;    // 上次打开时间戳
}

export interface CheckRootResult {
    ok: boolean;
    root: string;
    exists: boolean;
    isDir: boolean;
    alreadyRegistered: boolean;
    message?: string;
};

export interface ImportCheckResult {
    ok: boolean;        // 是否允许导入（hard）
    root: string;
    // code?: ErrorCode;
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
