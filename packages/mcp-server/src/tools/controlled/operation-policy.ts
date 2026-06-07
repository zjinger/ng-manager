import { blocked, type OperationRisk, type OperationType } from "./operation-result";

function isEnvEnabled(name: string): boolean {
  return process.env[name] === "true";
}

function blockedByEnvPolicy(type: OperationType, risk: OperationRisk, safetyMessage: string, envName: string) {
  return blocked(type, risk, safetyMessage, `${envName}=true is required before confirmed ${type} operations can run`, {
    policy: {
      env: envName,
      requiredValue: "true",
      currentValue: process.env[envName] ? "[set-but-not-enabled]" : "[unset]",
    },
  });
}

export function requireExecutePolicy(type: OperationType, risk: OperationRisk, safetyMessage: string) {
  return isEnvEnabled("NGM_MCP_ALLOW_EXECUTE")
    ? null
    : blockedByEnvPolicy(type, risk, safetyMessage, "NGM_MCP_ALLOW_EXECUTE");
}

export function requireWritePolicy(risk: OperationRisk, safetyMessage: string) {
  return isEnvEnabled("NGM_MCP_ALLOW_WRITE")
    ? null
    : blockedByEnvPolicy("write", risk, safetyMessage, "NGM_MCP_ALLOW_WRITE");
}
