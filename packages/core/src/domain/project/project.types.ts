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

    // 工程相关的资源
    assets?: ProjectAssets;
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

/**
 * 工程导入检测结果
 */
export interface ImportCheckResult {
    ok: boolean;        // 是否允许导入（hard）
    root: string;
    code?: ErrorCode;
    reason?: string;    // hard fail
    detect?: DetectResult;
    warnings?: string[]; // soft
    meta?: ProjectMeta;
}

/**
 * 工程检测结果，包含框架、包管理器、脚本等信息，用于导入前的分析和提示
 * - 通过检测结果，用户可以了解工程的基本情况，确认是否导入，以及后续如何使用
 * - 例如：检测到 React 框架、npm 包管理器、常用脚本等，可以提示用户导入后如何运行和调试
 */
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

/**
 * 工程资源来源 - SVN
 * - 目前先只做 SVN，未来可扩展 Git/HTTP 等
 */
export interface ProjectAssetSourceSvn {
    kind: "svn";
    /** source id，用于 spriteConfig 绑定 */
    id: string;
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
 * - MVP 先只做 svn，未来可扩 git/http
 */
export interface ProjectAssets {
    iconsSvn: ProjectAssetSourceSvn; // 原始尺寸图标的 SVN 来源
    cutImageSvn?: ProjectAssetSourceSvn; // 可选：切图的 SVN 来源
}