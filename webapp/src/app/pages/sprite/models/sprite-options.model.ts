import { SpriteConfig, SpritesmithOptionsAlgorithm } from "@models/sprite.model";
import type { SvnCheckoutOptions as SvnCheckoutOptionsDto } from "@models/svn.model";

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

export type SvnCheckoutOptions = SvnCheckoutOptionsDto;

