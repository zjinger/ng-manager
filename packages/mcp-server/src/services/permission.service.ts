import { McpErrorCodes } from "../errors/error-codes";
import { McpToolError } from "../errors/mcp-tool-error";

export type McpActionType = "read" | "write" | "execute" | "external";

const requiredEnvByAction: Record<McpActionType, string[]> = {
  read: [],
  write: ["NGM_MCP_ALLOW_WRITE"],
  execute: ["NGM_MCP_ALLOW_EXECUTE"],
  external: ["NGM_MCP_ALLOW_HUB"],
};

function isEnabled(name: string): boolean {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

export class PermissionService {
  assertAllowed(actionType: McpActionType): void {
    const missing = this.getRequiredEnv(actionType).filter((name) => !isEnabled(name));
    if (missing.length === 0) return;

    const errorCode = actionType === "write"
      ? McpErrorCodes.WRITE_NOT_ALLOWED
      : actionType === "execute"
        ? McpErrorCodes.EXECUTE_NOT_ALLOWED
        : McpErrorCodes.TOOL_INPUT_INVALID;
    throw new McpToolError(errorCode, `${missing.join(", ")}=true is required before confirmed ${actionType} operations can run`, {
      requires: missing,
      policy: missing.map((name) => ({
        env: name,
        requiredValue: "true",
        currentValue: process.env[name] ? "[set-but-not-enabled]" : "[unset]",
      })),
    });
  }

  getRequiredEnv(actionType: McpActionType): string[] {
    return requiredEnvByAction[actionType];
  }
}
