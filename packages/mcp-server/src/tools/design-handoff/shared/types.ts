/**
 * design-handoff 工具类型定义
 */

/** 设计稿文件项 */
export interface DraftFile {
  name: string;
  relPath: string;
  relativePath: string;
  dir: string;
  projectFilePath: string;
  size: number;
  sizeStr?: string;
  mtime: number;
}

/** 项目信息 */
export interface Project {
  id: string;
  name: string;
  svnUrl: string;
  miscSvnUrl?: string;
  draftSvnUrl?: string;
  draftSource?: string;
  prototypeSvnUrl?: string;
  prototypeSource?: string;
  cssPrefix?: string;
  spriteUrlTemplate?: string;
  note?: string;
  copyTemplate?: string;
  exportCssPath?: string;
  exportSpritesDir?: string;
  createdAt: string;
  updatedAt: string;
}

/** 杂项图片项 */
export interface MiscImage {
  name: string;
  relPath: string;
  relativePath: string;
  size: number;
  sizeStr?: string;
  mtime: number;
}

/** 设计稿列表响应 */
export interface DraftListResponse {
  ok: boolean;
  projectId: string;
  list: DraftFile[];
}

/** 杂项图片列表响应 */
export interface MiscListResponse {
  ok: boolean;
  projectId: string;
  list: MiscImage[];
}

/** 设计稿解析状态 */
export type HandoffParseStatus = "unparsed" | "parsing" | "parsed" | "failed" | "outdated";

/** 设计稿解析结果 */
export interface HandoffResult {
  status: HandoffParseStatus;
  filePath: string;
  source?: string;
  parsedAt?: string;
  updatedAt?: string;
  duration?: string;
  error?: string;
  summary?: HandoffSummary;
  tokens?: HandoffTokens;
  components?: HandoffComponent[];
  assets?: HandoffAsset[];
  code?: HandoffCode;
  issues?: HandoffIssue[];
  logs?: string[];
}

/** 解析摘要 */
export interface HandoffSummary {
  pages: number;
  components: number;
  assets: number;
  tokens: number;
  issues: number;
  completeness: number;
  assetMatchRate?: number;
}

/** 设计 Tokens */
export interface HandoffTokens {
  colors: Array<{
    name: string;
    value: string;
    count: number;
    suggestion?: string;
  }>;
  typography: Array<{
    name: string;
    value: string;
    count: number;
  }>;
  spacing: string[];
  radius: string[];
}

/** UI 组件 */
export interface HandoffComponent {
  name: string;
  count: number;
  desc: string;
  css?: string;
}

/** 设计资源 */
export interface HandoffAsset {
  name: string;
  type: string;
  size: string;
  status: string;
  suggestion?: string;
}

/** 生成的代码 */
export interface HandoffCode {
  css: string;
  json: string;
}

/** 设计问题 */
export interface HandoffIssue {
  level: "error" | "warning" | "suggestion";
  title: string;
  message: string;
  suggestion?: string;
}

/** 解析响应（预留） */
export interface ParseResponse {
  ok: boolean;
  message?: string;
  jobId?: string;
}

/** 解析结果响应（预留） */
export interface ResultResponse {
  ok: boolean;
  projectId: string;
  filePath: string;
  result?: HandoffResult;
}
