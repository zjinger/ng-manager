import type { McpToolDefinition } from "../index";
import { nginxControlTools } from "../nginx/nginx-control.tools";
import { projectControlTools } from "../project/project-control.tools";
import { runtimeControlTools } from "../runtime/runtime-control.tools";

export function controlledTools(): McpToolDefinition[] {
  return [
    ...projectControlTools(),
    ...runtimeControlTools(),
    ...nginxControlTools(),
  ];
}
