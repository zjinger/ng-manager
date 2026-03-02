
export type SpritesmithOptionsAlgorithm = "binary-tree" | "top-down" | "left-right" | "diagonal";

export type SpriteGroupStatus = "ok" | "error";
/**
 * 工程项目雪碧图配置
 * - 绑定到 Project.assets.sources[].id
 */
export interface SpriteConfig {
    projectId: string;      // 绑定的项目 ID
    enabled: boolean;      // 是否启用雪碧图功能
    sourceId: string;     // 绑定 Project.assets.sources[] 的 id，表示雪碧图的资源来源
    localDir: string;      // 存放原始图标的本地目录，绝对路径
    prefix: string;       // "sl"
    template: string;     // 模板字符串，生成 less 文件用，例如 '<i class="{base} {class}" ></i>'
    spriteUrl: string;    // 生成的雪碧图访问 URL，例如 '/assets/icons/{group}.png'，其中 {group} 会被替换为分组名
    spriteExportDir?: string; // 可选：雪碧图导出目录，优先级高于全局配置
    lessExportDir?: string; // 可选：less 导出目录，优先级高于全局配置
    algorithm: SpritesmithOptionsAlgorithm;
    persistLess: boolean; // 是否在输出目录持久化 less 文件
    updatedAt: number;     // 上次更新时间戳，用于判断配置是否过期（例如文件变动后）
}


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


export type SpriteExportedPaths = {
    spriteOutPath?: string; // only png
    lessOutPath?: string;   // png/svg 都可能
};


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

export type SpriteGroupItem = {
    group: string;
    kind?: "png" | "svg";                 // 从 generate 可得；仅 getSprites 时可通过 meta 推断/留空
    spriteUrl?: string;                   // cfg.spriteUrl 模板替换
    previewSpriteUrl?: string;            // 用于 ng-manager 内部预览（永远可访问）
    meta?: SpriteMetaFile;                // 直接返回 meta（或者拆开成 tileWidth/classes...）
    lessText?: string;                    // 代码区
    exported?: SpriteExportedPaths;        // generate 时才有
    status?: SpriteGroupStatus;            // generate 时才有
    error?: string;                        // status=error 时才有

    // 可选：仅用于调试/高级预览（不建议 UI 强依赖）
    result?: GenerateGroupResult;
};

export type SpriteSnapshot = {
    projectId: string;
    sourceId: string;
    iconsRoot?: string;                   // generate 才一定有（getSprites 可以不返回）
    cacheOutDir: string;

    config: SpriteConfig;                 // 快照（两者都能返回）
    total: number;
    success?: number;                     // getSprites 可不填或等于 total（无错误信息）
    failed?: number;                      // getSprites 可不填或 0

    groups: SpriteGroupItem[];
};