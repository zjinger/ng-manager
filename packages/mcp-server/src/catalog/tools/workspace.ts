import type { ToolCatalogEntry } from "../types";

export const workspaceTools: ToolCatalogEntry[] = [
  {
    name: "ngm_workspace_summary",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Summarize the local ng-manager workspace and major app/package areas.",
  },
  {
    name: "ngm_workspace_list_packages",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "List local workspace package metadata from known ng-manager package roots.",
  },
  {
    name: "ngm_workspace_get_package",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Get package.json metadata for one local workspace package or app.",
  },
  {
    name: "ngm_workspace_mcp_tools",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "List ng-manager MCP tools with capability and skill mapping.",
  },
  {
    name: "ngm_workspace_capability_map",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Map ng-manager workspace areas to local capability domains.",
  },
  {
    name: "ngm_log_search",
    skill: "ngm-workspace",
    capability: "logs",
    riskLevel: "read",
    description: "Search recent ng-manager system logs by keyword.",
  },
  {
    name: "ngm_git_status",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Read Git working tree status for a project when the core Git service is available.",
  },
  {
    name: "ngm_git_diff",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Read Git diff for a project when the core Git service is available.",
  },
  {
    name: "ngm_workspace_diff",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Read a safe project diff summary without exposing forbidden workspace paths.",
  },
  {
    name: "ngm_workspace_apply_patch_preview",
    skill: "ngm-workspace",
    capability: "workspace",
    riskLevel: "read",
    description: "Preview a unified patch without writing files.",
  },
];

