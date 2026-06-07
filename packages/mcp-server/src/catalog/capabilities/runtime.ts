import type { CapabilityCatalogEntry } from "../types";

export const runtimeCapabilities: CapabilityCatalogEntry[] = [
  {
    id: "runtime",
    label: "Node runtime, Node version manager, and project runtime resolution",
    skills: ["ngm-runtime"],
    tools: [
      "ngm.runtime.current",
      "ngm.runtime.list",
      "ngm.runtime.resolveForProject",
      "ngm.runtime.detectRequirement",
      "ngm_runtime_set_for_project",
      "ngm.runtime.setForProject",
    ],
  },
];

