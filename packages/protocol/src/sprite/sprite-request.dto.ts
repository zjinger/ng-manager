export type SpritesmithOptionsAlgorithm = "binary-tree" | "top-down" | "left-right" | "diagonal";

export type IconGroupType = "png" | "svg" | "mixed" | "empty";

export type SpriteGroupStatus = "ok" | "error";

export interface SpriteConfigDto {
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

export interface GenerateSpriteOptionsDto {
    groups?: string[];
    forceRefresh?: boolean;
    algorithm?: SpritesmithOptionsAlgorithm;
    continueOnError?: boolean;
    concurrency?: number;
}

export interface ProjectAssetSourceSvnDto {
    id: string;
    label: string;
    url?: string;
    user?: string;
    password?: string;
    localDir?: string;
    mode: "checkout" | "export" | "manual";
}

export interface ProjectAssetsDto {
    iconsSvn?: ProjectAssetSourceSvnDto;
    cutImageSvn?: ProjectAssetSourceSvnDto;
}

export interface SaveSpriteConfigBodyDto {
    config: Omit<SpriteConfigDto, "updatedAt" | "projectId">;
    assets?: ProjectAssetsDto;
}