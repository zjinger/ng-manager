import { SpritesmithOptionsAlgorithm } from "@models/sprite.model";

export type GenerateSpriteOptions = {
    group: string;                 // "10-10"
    // 如果不传 prefix，默认 "sl"
    prefix?: string;               // css prefix
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
    // 仅 png：是否写 group.less 到磁盘（默认 true）
    persistLess?: boolean;
    // svg：自定义 url 规则
}
