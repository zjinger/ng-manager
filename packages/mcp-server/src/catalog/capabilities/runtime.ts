import type { CapabilityCatalogEntry } from "../types";

export const runtimeCapabilities: CapabilityCatalogEntry[] = [
  {
    id: "runtime",
    label: "Node runtime, Node version manager, and project runtime resolution",
    skills: ["ngm-runtime"],
    tools: [
      "ngm_runtime_current",
      "ngm_runtime_list",
      "ngm_runtime_resolve_for_project",
      "ngm_runtime_detect_requirement",
      "ngm_runtime_set_for_project",
    ],
  },
];

