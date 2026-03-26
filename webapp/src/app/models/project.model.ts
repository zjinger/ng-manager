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

    repoPageUrl?: string; // git 仓库网页地址
    repoUrl?: string;     // git 仓库url

    assets?: ProjectAssets; // 工程相关的资源，如图标、设计稿等
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

export type ProjectHubV2ConfigDraft = {
    baseUrl: string;
    projectKey: string;
    token: string;
};

export type EditingProjectDraft = {
    id: string;
    name: string;
    repoPageUrl?: string;
    description?: string;
    hubV2: ProjectHubV2ConfigDraft;
};

/**
 * 工程资源来源 - SVN
 * - 目前先只做 SVN，未来可扩展 Git/HTTP 等
 */
export interface ProjectAssetSourceSvn {
    kind: "svn";
    /** source id，用于 spriteConfig 绑定 */
    id?: string;
    /** 展示用，比如 "原尺寸图标SVN地址" */
    label: string;
    /** SVN 目录 URL,比如 svn://192.168.1.10/.../3-原尺寸图标 */
    url: string;
    /**
    * 本地目录（manual 模式下由用户自己 checkout/export 后填写）
    * 例：D:\work\ui-icons\3-原尺寸图标
    */
    localDir?: string;
    /**
    * manual: 用户自己维护工作副本/导出目录
    * export/checkout: 未来增强（ngm 管控缓存目录）
    */
    mode: "checkout" | "export" | "manual";
}

/**
 * 工程相关的资源，如图标、设计稿等，可能来自不同的源（svn/git/http等），先定义一个通用接口，后续根据需要扩展
 * - MVP 先只做 svn
 */
export interface ProjectAssets {
    iconsSvn: ProjectAssetSourceSvn; // 原始尺寸图标的 SVN 来源
    cutImageSvn?: ProjectAssetSourceSvn; // 可选：切图的 SVN 来源
}
