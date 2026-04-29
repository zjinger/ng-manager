import type { SpriteConfigDto, SpriteGroupStatus } from "./sprite-request.dto";
import type { GenerateGroupResult } from "./sprite.types";
import type { ProjectAssetsDto } from "./sprite-request.dto";

export interface SpriteClassMetaDto {
    name: string;
    className: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SvgIconMetaDto {
    name: string;
    className: string;
    file: string;
    url: string;
    previewUrl?: string;
}

export interface SpriteMetaFileDto {
    mode: "png";
    group: string;
    tileWidth: number;
    tileHeight: number;
    spriteWidth: number;
    spriteHeight: number;
    classes: SpriteClassMetaDto[];
}

export interface SvgMetaFileDto {
    mode: "svg";
    group: string;
    tileWidth: number;
    tileHeight: number;
    prefix: string;
    size: string;
    icons: SvgIconMetaDto[];
}

export type SpriteMetaFileOrSvgMetaFileDto = SpriteMetaFileDto | SvgMetaFileDto;

export interface SpriteGroupItemDto {
    group: string;
    kind?: "png" | "svg";
    previewSpriteUrl?: string;
    spriteUrl?: string;
    meta?: SpriteMetaFileOrSvgMetaFileDto;
    lessText?: string;
    exported?: {
        spriteOutPath?: string;
        lessOutPath?: string;
    };
    status?: SpriteGroupStatus;
    error?: string;
}

export interface SpriteSnapshotDto {
    projectId: string;
    sourceId: string;
    iconsRoot?: string;
    cacheOutDir: string;
    config: SpriteConfigDto;
    total: number;
    success?: number;
    failed?: number;
    groups: SpriteGroupItemDto[];
}

export interface GenerateSpriteResultDto {
    projectId: string;
    sourceId: string;
    iconsRoot?: string;
    cacheOutDir: string;
    config: SpriteConfigDto;
    total: number;
    success?: number;
    failed?: number;
    groups: SpriteGroupItemDto[];
}

export interface SaveSpriteConfigResponseDto {
    cfg: SpriteConfigDto;
    project: {
        id: string;
        name: string;
        root: string;
        assets?: ProjectAssetsDto;
    };
}

export interface SpriteEntryDto {
    name: string;
    kind: "dir" | "file";
    ext?: string;
    url?: string;
    fileCount?: number;
}

export interface BrowseEntriesDto {
    root: string;
    entries: SpriteEntryDto[];
}

export interface BrowseFilesDto extends BrowseEntriesDto {
    dir?: string;
}