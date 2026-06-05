export type ToolRiskLevel = "read" | "write" | "execute" | "dangerous";

export type ToolPolicy = Record<ToolRiskLevel, boolean>;

function envFlag(name: string): boolean {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

export function createDefaultToolPolicy(): ToolPolicy {
  return {
    read: true,
    write: envFlag("NGM_MCP_ALLOW_WRITE"),
    execute: envFlag("NGM_MCP_ALLOW_EXECUTE"),
    dangerous: envFlag("NGM_MCP_ALLOW_DANGEROUS"),
  };
}
