import type { McpToolDefinition } from "../index";
import { getConfiguredProject, listConfiguredProjects } from "./config/index";
import { projectSelectorSchema } from "./schemas";
import { ok } from "../../utils/result";

export function hubV2ProjectsTools(): McpToolDefinition[] {
  return [
    {
      name: "hub_v2_projects_list",
      description: "List locally configured Hub V2 project aliases without exposing tokens.",
      riskLevel: "read",
      inputSchema: projectSelectorSchema,
      handler(args) {
        return ok("hub_v2_projects_list", listConfiguredProjects(args.project ?? args.projectKey));
      },
    },
    {
      name: "hub_v2_projects_get",
      description: "Get one locally configured Hub V2 project summary without exposing tokens.",
      riskLevel: "read",
      inputSchema: projectSelectorSchema,
      handler(args) {
        return ok("hub_v2_projects_get", getConfiguredProject(args));
      },
    },
  ];
}
