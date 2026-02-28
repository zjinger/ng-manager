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


/** 单个 group 的执行结果 */
export type GenerateGroupBatchItem =
    | {
        ok: true;
        group: string;
        type: Exclude<IconGroupType, "mixed" | "empty">; // png | svg
        result: GenerateGroupResult;
    }
    | {
        ok: false;
        group: string;
        error: string;
    };

export type GenerateGroupBatchOptions = {
    /** 源目录：包含多个 group 子目录 */
    iconsRoot: string;

    /** 输出目录：png 的 sprite/meta/less 等写到这里（可作为缓存目录） */
    outDir: string;

    /** spriteUrl 模板：用于 less 里的 background-image，支持 {group} 替换 */
    spriteUrlTemplate: string;

    /** 指定生成哪些 group；不传则扫描 iconsRoot 下的子目录 */
    groups?: string[];

    /** css prefix，默认 "sl" */
    prefix?: string;

    /** spritesmith algorithm，默认 "binary-tree" */
    algorithm?: SpritesmithOptionsAlgorithm;

    /** cache 行为：透传到 generatePngGroup */
    cache?: CacheOptions;

    /** 并发数，默认 1（png 生成吃 CPU） */
    concurrency?: number;

    /** 是否遇到错误继续处理后续 group，默认 true */
    continueOnError?: boolean;

    /** svg urlResolver：生成 svg result 时每个 icon 的 url 映射 */
    svgUrlResolver?: GenerateSvgGroupOptions["urlResolver"];

    /** 自定义 group 目录过滤：默认只取目录 */
    groupFilter?: (groupName: string) => boolean;
};

export type GenerateGroupBatchResult = {
    ok: boolean;
    total: number;
    success: number;
    failed: number;
    items: GenerateGroupBatchItem[];
};