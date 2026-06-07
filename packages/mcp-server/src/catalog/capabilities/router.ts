import type { CapabilityCatalogEntry } from "../types";

export const routerCapabilities: CapabilityCatalogEntry[] = [
  {
    id: "routing",
    label: "Skill routing and MCP capability discovery",
    skills: ["ngm-router"],
    tools: ["ngm_capabilities", "ngm_doctor", "ngm_route_task"],
  },
];

