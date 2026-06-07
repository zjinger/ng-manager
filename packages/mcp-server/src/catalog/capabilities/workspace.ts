import type { CapabilityCatalogEntry } from "../types";

export const workspaceCapabilities: CapabilityCatalogEntry[] = [
  {
    id: "workspace",
    label: "Local ng-manager workspace, monorepo, package metadata, MCP tools, API debugging, design handoff, and CodeGraph availability",
    skills: ["ngm-workspace"],
    tools: [
      "ngm_workspace_summary",
      "ngm_workspace_list_packages",
      "ngm_workspace_get_package",
      "ngm_workspace_mcp_tools",
      "ngm_workspace_capability_map",
      "ngm_workspace_diff",
      "ngm_workspace_apply_patch_preview",
      "ngm_git_status",
      "ngm_git_diff",
      "ngm_log_search",
    ],
    notes: ["CodeGraph DB is not exposed directly by this MCP server in the current read-only phase."],
  },
];

