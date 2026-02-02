export type IconGroupType = "png" | "svg" | "mixed" | "empty";

export interface SpriteClassMeta {
    name: string;       // icon name (no ext)
    className: string;  // sl-12-home (without dot)
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SpriteMetaFile {
    group: string;
    // tile size from group name, e.g. 10-10
    tileWidth: number;
    tileHeight: number;

    // sprite sheet size from spritesmith
    spriteWidth: number;
    spriteHeight: number;

    classes: SpriteClassMeta[];
}

export interface GenerateSpriteResult {
    mode: "png";
    group: string;
    type: IconGroupType; // png/mixed/empty (here should be png)
    spritePath: string;  // absolute path to sprite file
    spriteUrl: string;   // for css reference (can be same as spritePath or a server url)
    lessText: string;
    classes: SpriteClassMeta[];

    tileWidth: number;
    tileHeight: number;
    spriteWidth: number;
    spriteHeight: number;

    // useful for UI preview
    metaPath: string;
    lessPath?: string; // if persisted
}

export interface SvgIconMeta {
    name: string;
    className: string;
    file: string;
    url: string;
}

export interface GenerateSvgGroupResult {
    mode: "svg";
    group: string;
    type: IconGroupType; // svg/mixed/empty
    icons: SvgIconMeta[];
    lessText: string; // hint less (can be empty)
}

export type GenerateGroupResult = GenerateSpriteResult | GenerateSvgGroupResult;

export interface SpriteCssOptions {
    /** cssPrefix like "sl" */
    prefix?: string;
    /**
     * Provide a final url/path used in less: background-image: url("...")
     * If not provided, use spriteUrl as-is.
     */
    spriteUrlResolver?: (ctx: {
        spriteUrl: string;
        group: string;
    }) => string;
}

export interface CacheOptions {
    enabled?: boolean;
    forceRefresh?: boolean;
    /** meta filename suffix, default ".meta.json" */
    metaSuffix?: string;
    /** persist group less file beside sprite, default true */
    persistLess?: boolean;
}

export type SpritesmithOptionsAlgorithm = "binary-tree" | "top-down" | "left-right" | "diagonal";

export interface SpritesmithOptions {
    algorithm?: SpritesmithOptionsAlgorithm;
}

export interface GeneratePngGroupOptions {
    group: string;
    groupDir: string;      // absolute dir containing png icons
    outDir: string;        // absolute output dir for this group
    spriteFileName?: string; // default `${group}.png`
    spriteUrl: string;     // default same as sprite file name or server url mapping
    css?: SpriteCssOptions;
    cache?: CacheOptions;
    spritesmith?: SpritesmithOptions;
    /**
     * icon file filter, default only *.png
     * return true => include
     */
    filter?: (fileName: string) => boolean;
    /**
     * sort files, default: numeric first then localeCompare(numeric)
     */
    sort?: (a: string, b: string) => number;
}

export interface GenerateSvgGroupOptions {
    group: string;
    groupDir: string;
    /** cssPrefix like "sl" */
    prefix?: string;
    /** map a file name to public url used by UI */
    urlResolver?: (ctx: { group: string; file: string }) => string;
}

export interface GenerateGroupOptions {
    group: string;
    groupDir: string;
    outDir: string;
    spriteUrl: string;
    css?: SpriteCssOptions;
    cache?: CacheOptions;
    spritesmith?: SpritesmithOptions;
    svg?: Omit<GenerateSvgGroupOptions, "group" | "groupDir">;
}
