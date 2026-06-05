import type { ToolRiskLevel, ToolPolicy } from "./tool-policy";

export function assertToolPolicy(policy: ToolPolicy, toolName: string, riskLevel: ToolRiskLevel): void {
  if (!policy[riskLevel]) {
    throw new Error(`Tool ${toolName} is blocked by policy: ${riskLevel} tools are disabled`);
  }
}
