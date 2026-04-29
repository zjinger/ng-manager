export interface SpriteClassMeta {
    name: string;
    className: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SvgIconMeta {
    name: string;
    className: string;
    file: string;
    url: string;
    previewUrl?: string;
}

export interface SpriteMetaFile {
    mode: "png";
    group: string;
    tileWidth: number;
    tileHeight: number;
    spriteWidth: number;
    spriteHeight: number;
    classes: SpriteClassMeta[];
}

export interface SvgMetaFile {
    mode: "svg";
    group: string;
    tileWidth: number;
    tileHeight: number;
    prefix: string;
    size: string;
    icons: SvgIconMeta[];
}

export type GenerateGroupResult = SpriteMetaFile | SvgMetaFile;