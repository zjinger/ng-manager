import { GenerateGroupResult, SpriteMetaFile, SvgMetaFile, SpritesmithOptionsAlgorithm } from "../types";

export type SpriteGroupStatus = "ok" | "error";

export interface SpriteConfig {
    projectId: string;
    enabled: boolean;
    sourceId: string;
    localDir: string;
    prefix: string;
    template: string;
    spriteUrl: string;
    spriteExportDir?: string;
    lessExportDir?: string;
    algorithm: SpritesmithOptionsAlgorithm;
    persistLess: boolean;
    updatedAt: number;
    localImageRoot?: string;
    localCacheDir?: string;
    /** 映射到远端快捷雪碧图服务的项目 ID */
    quickSpriteProjectId?: string;
    /** 是否启用远端快捷雪碧图（代替本地 SVN 拉取） */
    quickSpriteEnabled?: boolean;
    /** 远端快捷雪碧图服务的基础 URL（若不配置则使用环境变量 QUICK_SPRITE_BASE_URL） */
    quickSpriteBaseUrl?: string;
}

export type GenerateSpriteOptions = {
    groups?: string[];
    forceRefresh?: boolean;
    algorithm?: SpritesmithOptionsAlgorithm;
    continueOnError?: boolean;
    concurrency?: number;
}

export type SpriteExportedPaths = {
    spriteOutPath?: string;
    lessOutPath?: string;
};

export type SpriteGroupItem = {
    group: string;
    kind?: "png" | "svg";
    previewSpriteUrl?: string;
    spriteUrl?: string;
    meta?: SpriteMetaFile | SvgMetaFile;
    lessText?: string;
    exported?: SpriteExportedPaths;
    status?: SpriteGroupStatus;
    error?: string;
};

export type SpriteSnapshot = {
    projectId: string;
    sourceId: string;
    iconsRoot?: string;
    cacheOutDir: string;
    config: SpriteConfig;
    total: number;
    success?: number;
    failed?: number;
    groups: SpriteGroupItem[];
};
