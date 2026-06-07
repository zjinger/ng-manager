import type { ToolCatalogEntry } from "../types";

export const hubV2DocsTools: ToolCatalogEntry[] = [
  {
    name: "hub_v2_docs_list",
    skill: "hub-v2-docs",
    capability: "hub-v2",
    riskLevel: "read",
    description: "List Hub V2 project documents.",
  },
  {
    name: "hub_v2_docs_get",
    skill: "hub-v2-docs",
    capability: "hub-v2",
    riskLevel: "read",
    description: "Read a Hub V2 project document by id.",
  },
  {
    name: "hub_v2_docs_get_by_slug",
    skill: "hub-v2-docs",
    capability: "hub-v2",
    riskLevel: "read",
    description: "Read a Hub V2 project document by slug.",
  },
  {
    name: "hub_v2_docs_create",
    skill: "hub-v2-docs",
    capability: "hub-v2",
    riskLevel: "write",
    description: "Preview or create a Hub V2 project document draft with explicit confirmation.",
  },
  {
    name: "hub_v2_docs_update",
    skill: "hub-v2-docs",
    capability: "hub-v2",
    riskLevel: "write",
    description: "Preview or update a Hub V2 project document with explicit confirmation.",
  },
];

