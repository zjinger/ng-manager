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
