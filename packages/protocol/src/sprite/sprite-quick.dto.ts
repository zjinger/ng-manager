/**
 * 快捷雪碧图（远端服务）数据模型
 *
 * 这些类型描述了远端雪碧图服务返回的数据结构，
 * 与本地 Core 的 Project / SpriteConfig / SpriteSnapshot 是完全不同的数据源。
 *
 * 路由层通过 mapper 函数将远端数据转换为现有 SpriteSnapshotDto，
 * 使前端 SpriteResultTabsComponent 能够零改动复用。
 */

import { IconGroupType, SpriteClassMeta } from "./sprite.types";

// ========== 远端项目配置 ==========

export interface QuickSpriteProjectDto {
    /** 项目英文 slug（唯一标识） */
    id: string;
    /** 项目中文展示名 */
    name: string;
    /** 图标 SVN 地址 */
    svnUrl: string;
    /** 其他图片 SVN 地址（可选） */
    miscSvnUrl?: string;
    /** 设计稿 SVN 地址（可选） */
    draftSvnUrl?: string;
    /** 图标子路径，例如 "3.原尺寸切图" */
    iconsPath?: string;
    /** 其他图片子路径，例如 "5.其他切图" */
    miscPath?: string;
    /** CSS 类名前缀，默认 "sl" */
    cssPrefix?: string;
    /**
     * 雪碧图 URL 模板，支持占位符：
     * - {project} 当前 projectId
     * - {group}   分组名（如 10-10）
     * - {size}    分组尺寸前缀（如 10）
     *
     * 例如："/static/icons/{project}/{group}.png"
     */
    spriteUrlTemplate?: string;
    /** 备注说明 */
    note?: string;
    /** 复制代码模板 */
    copyTemplate?: string;
    /** 导出 CSS 的目标路径 */
    exportCssPath?: string;
    /** 导出雪碧图 PNG 的目录，支持占位符 {project} */
    exportSpritesDir?: string;
    /** 创建时间（ISO 字符串） */
    createdAt: string;
    /** 更新时间（ISO 字符串） */
    updatedAt: string;
    /** 运行时同步信息（可选） */
    runtime?: QuickSpriteRuntimeDto;
}

export type SyncMode = "checkout" | "update";

export interface QuickSpriteRuntimeDto {
    projectId: string;
    /** icons 工作副本最后同步时间 */
    lastSyncAt?: string;
    lastSyncMode?: SyncMode;
    /** misc 工作副本信息 */
    miscEnabled?: boolean;
    miscLastSyncAt?: string;
    miscLastSyncMode?: SyncMode;
    /** 最近一次输出摘要 */
    lastStdout?: string;
    lastStderr?: string;
}

// ========== 快捷生成相关 ==========

/** POST /generate-sprite 请求体 */
export interface QuickGenerateRequestDto {
    /** 远端项目 ID */
    projectId: string;
    /** 要生成的分组 */
    group: string;
    /** 是否强制刷新（跳过缓存） */
    forceRefresh?: boolean;
}

/** 远端生成雪碧图响应（单个分组） */
export interface QuickGenerateResponseDto {
    mode: "png";
    /** 图标分组类型：png | mixed | empty */
    type: IconGroupType;
    /** 生成的雪碧图 PNG 地址 */
    spriteUrl: string;
    /** 生成的 CSS 文本 */
    cssText: string;
    /** 分组名，如 "10-10" */
    group: string;
    /** 雪碧图整体宽度 */
    width: number;
    /** 雪碧图整体高度 */
    height: number;
    /** 各个图标的 class 元数据 */
    classes: SpriteClassMeta[];
}

// ========== SVN 同步相关 ==========

export interface QuickSvnUpdateResultDto {
    ok: boolean;
    stdout: string;
    stderr: string;
    updatedAt: string;
    project: string;
    mode: "checkout" | "update";
}

// ========== 其他辅助类型 ==========

export interface QuickMiscItemDto {
    name: string;
    relPath: string;
    projectImgPath: string;
    dir: string;
    w: number;
    h: number;
    size: number;
    sizeStr?: string;
    mtime: number;
}

export interface QuickMiscResultDto {
    ok: boolean;
    list: QuickMiscItemDto[];
    projectId: string;
}