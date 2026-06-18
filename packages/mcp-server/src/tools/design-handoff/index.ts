/**
 * design-handoff 工具模块导出
 */
import type { McpToolDefinition } from "../index";
import { projectTools } from "./projects.tools";
import { draftTools } from "./draft.tools";
import { miscTools } from "./misc.tools";
import { spriteTools } from "./sprite.tools";
import { spriteDownloadTools } from "./sprite-download.tools";
import { spriteConfigTools } from "./sprite-config.tools";
import { handoffParseTools } from "./handoff-parse.tools";

/** 导出所有 design-handoff 工具 */
export function designHandoffTools(): McpToolDefinition[] {
  return [
    ...projectTools(),
    ...draftTools(),
    ...miscTools(),
    ...spriteTools(),
    ...spriteDownloadTools(),
    ...spriteConfigTools(),
    ...handoffParseTools(),
  ];
}

// 导出 shared 模块（供外部使用）
export {
  DesignHandoffClient,
  resolveDesignHandoffConfig,
  DesignHandoffHttpError,
  handleHttpError,
} from "./shared";

export type {
  DesignHandoffConfig,
  HttpMethod,
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
} from "./shared";
