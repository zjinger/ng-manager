import { blocked, type OperationRisk, type OperationType } from "./operation-result";
import { McpErrorCodes } from "../../errors/error-codes";
import { McpToolError } from "../../errors/mcp-tool-error";
import { PermissionService, type McpActionType } from "../../services/permission.service";

const permission = new PermissionService();

function toActionType(type: OperationType): McpActionType {
  return type === "write" ? "write" : "execute";
}

function blockedByEnvPolicy(type: OperationType, risk: OperationRisk, safetyMessage: string, error: McpToolError) {
  const detail = error.detail as { policy?: Array<{ env: string; requiredValue: string; currentValue: string }>; requires?: string[] } | undefined;
  const envName = detail?.requires?.[0] ?? (type === "write" ? "NGM_MCP_ALLOW_WRITE" : "NGM_MCP_ALLOW_EXECUTE");
  return blocked(type, risk, safetyMessage, error.message, {
    requires: detail?.requires ?? [envName],
    policy: {
      env: envName,
      requiredValue: "true",
      currentValue: process.env[envName] ? "[set-but-not-enabled]" : "[unset]",
    },
  }, error.errorCode);
}

export function requireExecutePolicy(type: OperationType, risk: OperationRisk, safetyMessage: string) {
  try {
    permission.assertAllowed(toActionType(type));
    return null;
  } catch (error) {
    if (error instanceof McpToolError) return blockedByEnvPolicy(type, risk, safetyMessage, error);
    return blocked(type, risk, safetyMessage, "confirmed execute operation is not allowed", {}, McpErrorCodes.EXECUTE_NOT_ALLOWED);
  }
}

export function requireWritePolicy(risk: OperationRisk, safetyMessage: string) {
  try {
    permission.assertAllowed("write");
    return null;
  } catch (error) {
    if (error instanceof McpToolError) return blockedByEnvPolicy("write", risk, safetyMessage, error);
    return blocked("write", risk, safetyMessage, "confirmed write operation is not allowed", {}, McpErrorCodes.WRITE_NOT_ALLOWED);
  }
}

export function requiredEnv(type: OperationType): string[] {
  return permission.getRequiredEnv(toActionType(type));
}
