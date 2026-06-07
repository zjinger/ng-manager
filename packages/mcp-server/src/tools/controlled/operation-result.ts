export type ControlledStatus = "preview" | "executed" | "blocked" | "failed";
export type OperationType = "write" | "execute" | "service-control";
export type OperationRisk = "low" | "medium" | "high";

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

export function blocked(type: OperationType, risk: OperationRisk, safetyMessage: string, reason: string, data?: Record<string, unknown>) {
  return {
    operation: operation("blocked", type, risk, safetyMessage),
    reason,
    ...(data ?? {}),
  };
}
