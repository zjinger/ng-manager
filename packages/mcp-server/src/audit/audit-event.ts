import type { ToolRiskLevel } from "../policy/tool-policy";
import type { ToolResult } from "../utils/result";

export type AuditToolEvent = {
  tool: string;
  riskLevel: ToolRiskLevel;
  args?: unknown;
  result?: ToolResult;
  error?: unknown;
  durationMs: number;
};

export type AuditWarning = {
  code: "AUDIT_LOG_WRITE_FAILED";
  message: string;
};
