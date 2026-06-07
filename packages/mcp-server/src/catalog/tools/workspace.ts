import type { ToolCatalogEntry } from "../types";

export const workspaceTools: ToolCatalogEntry[] = [
  {
    name: "ngm.workspace.summary",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Summarize the local ng-manager workspace and major app/package areas.",
  },
  {
    name: "ngm.workspace.listPackages",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "List local workspace package metadata from known ng-manager package roots.",
  },
  {
    name: "ngm.workspace.getPackage",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Get package.json metadata for one local workspace package or app.",
  },
  {
    name: "ngm.workspace.mcpTools",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "List ng-manager MCP tools with capability and skill mapping.",
  },
  {
    name: "ngm.workspace.capabilityMap",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Map ng-manager workspace areas to local capability domains.",
  },
  {
    name: "ngm.log.search",
    skill: "ngm-workspace",
    capability: "logs",
    riskLevel: "read",
    description: "Search recent ng-manager system logs by keyword.",
  },
  {
    name: "ngm.git.status",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Read Git working tree status for a project when the core Git service is available.",
  },
  {
    name: "ngm.git.diff",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Read Git diff for a project when the core Git service is available.",
  },
  {
    name: "ngm.workspace.diff",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Read a safe project diff summary without exposing forbidden workspace paths.",
  },
  {
    name: "ngm.workspace.applyPatchPreview",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Preview a unified patch without writing files.",
  },
];

