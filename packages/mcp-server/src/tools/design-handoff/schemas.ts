/**
 * Design Handoff 工具输入验证 schemas
 * 按功能域组织
 */
import { z } from "zod";

// ==================== 通用 Schema ====================

/** 项目 ID 选择器 */
export const projectIdSchema = z.object({
  projectId: z.string().trim().min(1).describe("项目 ID"),
}).strict();

/** 带子路径的选择器 */
export const subPathSchema = projectIdSchema.extend({
  subPath: z.string().trim().optional().describe("子目录路径（可选）"),
}).strict();

// ==================== 项目相关 ====================

/** 获取项目列表 */
export const listProjectsSchema = z.object({}).strict();

/** 获取项目详情 */
export const getProjectSchema = projectIdSchema;

// ==================== 设计稿相关 ====================

/** 列出设计稿文件 */
export const listDraftFilesSchema = subPathSchema.extend({
  indexOnly: z.boolean().optional().describe("是否只返回 index.html 文件，默认为 true。设置为 false 可返回所有 HTML 文件"),
}).strict();

/** 列出原型图文件 */
export const listPrototypeFilesSchema = subPathSchema.extend({
  indexOnly: z.boolean().optional().describe("是否只返回 index.html 文件，默认为 true。设置为 false 可返回所有 HTML 文件"),
}).strict();

// ==================== 杂项图片相关 ====================

/** 列出杂项图片 */
export const listMiscImagesSchema = subPathSchema;

/** 下载切图资源 */
export const downloadMiscZipSchema = projectIdSchema;

// ==================== 雪碧图相关 ====================

/** 列出图标分组 */
export const listGroupsSchema = projectIdSchema;

/** 获取雪碧图结果 */
export const getSpriteResultsSchema = projectIdSchema;

// ==================== 雪碧图下载相关 ====================

/** 下载雪碧图图片 */
export const downloadSpriteImageSchema = z.object({
  projectId: z.string().trim().min(1).describe("项目 ID"),
  group: z.string().trim().min(1).describe("图标分组名，如 '10-10'"),
  outputDir: z.string().trim().min(1).describe("目标文件夹路径"),
}).strict();

/** 下载雪碧图 CSS */
export const downloadSpriteCssSchema = z.object({
  projectId: z.string().trim().min(1).describe("项目 ID"),
  group: z.string().trim().min(1).describe("图标分组名，如 '10-10'"),
  outputDir: z.string().trim().min(1).describe("目标文件夹路径"),
}).strict();

/** 下载全部雪碧图 */
export const downloadAllSpritesSchema = z.object({
  projectId: z.string().trim().min(1).describe("项目 ID"),
  outputDir: z.string().trim().min(1).describe("目标文件夹路径"),
}).strict();

// ==================== 雪碧图配置相关 ====================

/** 更新雪碧图配置 */
export const updateSpriteConfigSchema = z.object({
  projectId: z.string().trim().min(1).describe("项目 ID"),
  cssPrefix: z.string().trim().optional().describe("CSS 类名前缀，如 'sl'"),
  spriteUrlTemplate: z.string().trim().optional().describe("雪碧图 URL 模板，支持 {project} {group} {size} 占位符"),
  copyTemplate: z.string().trim().optional().describe("复制代码模板"),
  note: z.string().trim().optional().describe("项目备注"),
  confirm: z.boolean().optional().describe("确认执行，默认为 false"),
}).strict();

// ==================== 设计稿解析（预留） ====================

/** 解析设计稿 */
export const parseDraftSchema = projectIdSchema.extend({
  filePath: z.string().trim().min(1).describe("设计稿文件路径"),
}).strict();

/** 获取解析结果 */
export const getParseResultSchema = projectIdSchema.extend({
  filePath: z.string().trim().min(1).describe("设计稿文件路径"),
}).strict();
