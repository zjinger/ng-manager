import type { ToolCatalogEntry } from "../types";

export const runtimeTools: ToolCatalogEntry[] = [
  {
    name: "ngm_runtime_current",
    skill: "ngm-runtime",
    capability: "runtime",
    riskLevel: "read",
    description: "Read current Node version manager information.",
  },
  {
    name: "ngm_runtime_list",
    skill: "ngm-runtime",
    capability: "runtime",
    riskLevel: "read",
    description: "List Node runtimes known to ng-manager.",
  },
  {
    name: "ngm_runtime_resolve_for_project",
    skill: "ngm-runtime",
    capability: "runtime",
    riskLevel: "read",
    description: "Resolve the Node runtime ng-manager would use for a project.",
  },
  {
    name: "ngm_runtime_detect_requirement",
    skill: "ngm-runtime",
    capability: "runtime",
    riskLevel: "read",
    description: "Detect project Node version requirements from package metadata.",
  },
  {
    name: "ngm_runtime_set_for_project",
    skill: "ngm-runtime",
    capability: "runtime",
    riskLevel: "write",
    description: "Preview or set a registered projectId's Node runtime binding through the local server; preferred over config/shell edits and audit logged when confirmed.",
  },
  {
    name: "ngm_runtime_set_for_project",
    skill: "ngm-runtime",
    capability: "runtime",
    riskLevel: "write",
    description: "Dotted alias for ngm_runtime_set_for_project.",
  },
];

