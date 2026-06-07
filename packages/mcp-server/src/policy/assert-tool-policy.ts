import type { ToolRiskLevel, ToolPolicy } from "./tool-policy";
import { McpErrorCodes } from "../errors/error-codes";
import { McpToolError } from "../errors/mcp-tool-error";

export function assertToolPolicy(policy: ToolPolicy, toolName: string, riskLevel: ToolRiskLevel): void {
  if (!policy[riskLevel]) {
    const errorCode = riskLevel === "write"
      ? McpErrorCodes.WRITE_NOT_ALLOWED
      : riskLevel === "execute"
        ? McpErrorCodes.EXECUTE_NOT_ALLOWED
        : McpErrorCodes.TOOL_INPUT_INVALID;
    throw new McpToolError(errorCode, `Tool ${toolName} is blocked by policy: ${riskLevel} tools are disabled`, {
      riskLevel,
    });
  }
}
