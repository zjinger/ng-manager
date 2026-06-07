import type { z } from "zod";
import type { ToolContext } from "../context/tool-context";
import type { ToolRiskLevel } from "../policy/tool-policy";
import type { ToolResult } from "../utils/result";
import { capabilityTools } from "./capability.tools";
import { controlledTools } from "./controlled.tools";
import { gitTools } from "./git.tools";
import { hubV2Tools } from "./hub-v2";
import { logTools } from "./log.tools";
import { nginxTools } from "./nginx.tools";
import { projectObserveTools } from "./project-observe.tools";
import { projectTools } from "./project.tools";
import { proxyTools } from "./proxy.tools";
import { runtimeTools } from "./runtime.tools";
import { taskTools } from "./task.tools";
import { workspaceTools } from "./workspace.tools";

export type McpToolDefinition<TSchema extends z.AnyZodObject = z.AnyZodObject> = {
  name: string;
  description: string;
  riskLevel: ToolRiskLevel;
  inputSchema: TSchema;
  allowPreviewWhenBlocked?: boolean;
  isConfirmed?: (args: z.infer<TSchema>) => boolean;
  handler(args: z.infer<TSchema>, context: ToolContext): Promise<ToolResult> | ToolResult;
};

export function allTools(): McpToolDefinition[] {
  return [
    ...capabilityTools(),
    ...workspaceTools(),
    ...controlledTools(),
    ...projectTools(),
    ...projectObserveTools(),
    ...taskTools(),
    ...logTools(),
    ...gitTools(),
    ...runtimeTools(),
    ...nginxTools(),
    ...proxyTools(),
    ...hubV2Tools(),
  ];
}
