import { SpriteConfig, SpritesmithOptionsAlgorithm } from "@models/sprite.model";

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

    /** 并发数（png 生成比较吃 CPU），默认 1 */
    concurrency?: number;
}

export type SvnCheckoutOptions = {
    // 是否强制重拉取
    forceRefresh?: boolean;
    // 需要拉取的资源类型，默认为全部
    types?: ('icons' | 'images')[];
    // 拉取后是否自动生成雪碧图
    generateAfterCheckout?: boolean;

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