import type { ToolCatalogEntry } from "../types";

export const routerTools: ToolCatalogEntry[] = [
  {
    name: "ngm_capabilities",
    skill: "ngm-router",
    capability: "discovery",
    riskLevel: "read",
    description: "List ng-manager MCP capability groups, skills, and tool coverage.",
  },
  {
    name: "ngm_route_task",
    skill: "ngm-router",
    capability: "routing",
    riskLevel: "read",
    description: "Route a user request to Hub V2 or NGM local skills and read-only MCP tools.",
  },
  {
    name: "ngm_doctor",
    skill: "ngm-router",
    capability: "discovery",
    riskLevel: "read",
    description: "Inspect MCP readiness, policy flags, Hub V2 config, and tool coverage through the controlled ng-manager MCP view.",
  },
];

