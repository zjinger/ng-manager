import type { ToolRiskLevel } from "../policy/tool-policy";

export type ToolCatalogEntry = {
  name: string;
  skill: string;
  capability: string;
  riskLevel: ToolRiskLevel;
  description: string;
};

export type CapabilityCatalogEntry = {
  id: string;
  label: string;
  skills: string[];
  tools: string[];
  notes?: string[];
};
