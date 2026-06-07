import type { CapabilityCatalogEntry } from "../types";

export const routerCapabilities: CapabilityCatalogEntry[] = [
  {
    id: "routing",
    label: "Skill routing and MCP capability discovery",
    skills: ["ngm-router"],
    tools: ["ngm.capabilities", "ngm_doctor", "ngm.routeTask"],
  },
];

