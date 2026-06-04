import { listConfiguredProjects, resolveContext } from "../config";
import { requestJson } from "../http";
import { ToolDefinition, contextOptions, objectSchema, projectProperties, str } from "../tool";
import { quote } from "../url";

export function personalTools(): ToolDefinition[] {
  return [
    {
      name: "sl_hub_v2.projects_list",
      title: "SL Hub V2 Projects List",
      description: "List configured SL Hub V2 project aliases.",
      inputSchema: objectSchema({ project: { type: "string" } }),
      handler: async (args) => listConfiguredProjects(str(args, "project")),
    },
    {
      name: "sl_hub_v2.me",
      title: "SL Hub V2 Me",
      description: "Read current Personal Token identity.",
      inputSchema: objectSchema(projectProperties),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        return requestJson(`${ctx.baseUrl}/api/personal/me`, ctx.token, "GET");
      },
    },
    {
      name: "sl_hub_v2.capabilities",
      title: "SL Hub V2 Capabilities",
      description: "Read current Personal Token capabilities for a project.",
      inputSchema: objectSchema(projectProperties),
      handler: async (args) => {
        const ctx = resolveContext(contextOptions(args), "personal");
        return requestJson(`${ctx.baseUrl}/api/personal/projects/${quote(ctx.projectKey)}/capabilities`, ctx.token, "GET");
      },
    },
  ];
}
