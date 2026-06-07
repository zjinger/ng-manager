import type { CapabilityCatalogEntry } from "../types";

export const workspaceCapabilities: CapabilityCatalogEntry[] = [
  {
    id: "workspace",
    label: "Local ng-manager workspace, monorepo, package metadata, MCP tools, API debugging, design handoff, and CodeGraph availability",
    skills: ["ngm-workspace"],
    tools: [
      "ngm.workspace.summary",
      "ngm.workspace.listPackages",
      "ngm.workspace.getPackage",
      "ngm.workspace.mcpTools",
      "ngm.workspace.capabilityMap",
      "ngm.workspace.diff",
      "ngm.workspace.applyPatchPreview",
      "ngm.git.status",
      "ngm.git.diff",
      "ngm.log.search",
    ],
    notes: ["CodeGraph DB is not exposed directly by this MCP server in the current read-only phase."],
  },
];

