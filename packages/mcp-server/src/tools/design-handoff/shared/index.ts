/**
 * shared 模块导出
 * 集中管理 client、config、errors、types
 */

// 导出 client
export { DesignHandoffClient } from "./client";
export type { HttpMethod } from "./client";

// 导出 config
export { resolveDesignHandoffConfig } from "./config";
export type { DesignHandoffConfig } from "./config";

// 导出 errors
export { DesignHandoffHttpError, handleHttpError } from "./errors";

// 导出 types
export type {
  DraftFile,
  Project,
  MiscImage,
  DraftListResponse,
  MiscListResponse,
  HandoffParseStatus,
  HandoffResult,
  HandoffSummary,
  HandoffTokens,
  HandoffComponent,
  HandoffAsset,
  HandoffCode,
  HandoffIssue,
  ParseResponse,
  ResultResponse,
} from "./types";
