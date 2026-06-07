import type { McpToolDefinition } from "../index";
import { nginxControlTools } from "../nginx/nginx-control.tools";
import { projectControlTools } from "../project/project-control.tools";
import { runtimeControlTools } from "../runtime/runtime-control.tools";

const dottedAliases: Record<string, string> = {
  ngm_project_run_script: "ngm.project.runScript",
  ngm_project_stop: "ngm.project.stop",
  ngm_runtime_set_for_project: "ngm.runtime.setForProject",
  ngm_nginx_reload: "ngm.nginx.reload",
  ngm_nginx_proxy_save: "ngm.nginx.proxy.save",
};

function aliasTools(tools: McpToolDefinition[]): McpToolDefinition[] {
  return tools
    .filter((tool) => dottedAliases[tool.name])
    .map((tool) => ({
      ...tool,
      name: dottedAliases[tool.name]!,
      description: `${tool.description} Alias of ${tool.name}.`,
      async handler(args, context) {
        const result = await tool.handler(args, context);
        return { ...result, tool: dottedAliases[tool.name]! };
      },
    }));
}

export function controlledTools(): McpToolDefinition[] {
  const tools = [
    ...projectControlTools(),
    ...runtimeControlTools(),
    ...nginxControlTools(),
  ];
  return [
    ...tools,
    ...aliasTools(tools),
  ];
}
