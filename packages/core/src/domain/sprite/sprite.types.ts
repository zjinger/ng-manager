export type SpritesmithOptionsAlgorithm = "binary-tree" | "top-down" | "left-right" | "diagonal";
/**
 * 工程项目雪碧图配置
 * - 绑定到 Project.assets.sources[].id
 */
export interface SpriteConfig {
    projectId: string;      // 绑定的项目 ID
    enabled: boolean;      // 是否启用雪碧图功能
    sourceId: string;     // 绑定 Project.assets.sources[].id
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

export type GenerateSpriteOptions = {
    // 资源分组，默认为空表示不分组
    groups?: string[];
    // 是否强制重生成
    forceRefresh?: boolean;
    /**
     * spritesmith algorithm
     * binary-tree: 经典的二叉树算法，效率较高，生成的雪碧图较紧凑，适用于大多数情况。
     * top-down: 从上到下排列图标，适用于图标尺寸相似的情况。
     * left-right: 从左到右排列图标，适用于图标尺寸相似的情况。
     * diagonal: 对角线排列图标，适用于图标尺寸差异较大的情况，但可能会浪费一些空间。
     */
    algorithm?: SpritesmithOptionsAlgorithm;

    // 生成失败时是否继续（默认 true）
    continueOnError?: boolean;

    /** 并发数（png 生成比较吃 CPU），默认 1 */
    concurrency?: number;
}

export type SpriteExportedPaths = {
    spriteOutPath?: string; // only png
    lessOutPath?: string;   // png/svg 都可能
};

export type SpriteGenerateItemResult =
    | {
        group: string;
        kind: "png" | "svg";
        spriteUrl?: string;              // png 才有意义
        exported?: SpriteExportedPaths;  // 如果执行导出
        // 这里不把 GenerateGroupResult 整个抛出去也行；但用于 UI 预览 classes/lessText 很有用
        result: any;
    }
    | { group: string; error: string };

export type SpriteGenerateResult = {
    code: 0 | 1; // 0 失败，1 成功
    projectId: string;
    sourceId: string;
    iconsRoot: string;
    cacheOutDir: string;
    export: {
        enabled: boolean;
        spriteExportDir: string;
        lessExportDir: string;
        persistLess: boolean;
    };
    total: number;
    success: number;
    failed: number;
    items: SpriteGenerateItemResult[];
    /** 生成使用的 config 快照 */
    config: SpriteConfig;
};