import type { McpErrorCode } from "../../errors/error-codes";

export type ControlledStatus = "preview" | "executed" | "blocked" | "failed";
export type OperationType = "write" | "execute" | "service-control";
export type OperationRisk = "low" | "medium" | "high";
export type ControlledAction = "preview" | "write" | "execute";

export function isConfirmed(args: { confirm?: boolean; dryRun?: boolean }): boolean {
  return args.confirm === true && args.dryRun !== true;
}

export function operation(status: ControlledStatus, type: OperationType, risk: OperationRisk, safetyMessage: string) {
  return {
    status,
    type,
    risk,
    safetyMessage,
  };
}

export function controlledFields(
  type: OperationType,
  confirmed: boolean,
  requires: string[] = []
): { action: ControlledAction; confirmed: boolean; requires?: string[] } {
  const action = confirmed ? (type === "write" ? "write" : "execute") : "preview";
  return {
    action,
    confirmed,
    ...(requires.length ? { requires } : {}),
  };
}

export function blocked(
  type: OperationType,
  risk: OperationRisk,
  safetyMessage: string,
  reason: string,
  data?: Record<string, unknown>,
  errorCode?: McpErrorCode
) {
  return {
    operation: operation("blocked", type, risk, safetyMessage),
    ...(errorCode ? { errorCode } : {}),
    reason,
    ...(data ?? {}),
  };
}
