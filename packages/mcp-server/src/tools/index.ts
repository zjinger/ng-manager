import type { z } from "zod";
import type { ToolContext } from "../context/tool-context";
import type { ToolRiskLevel } from "../policy/tool-policy";
import type { ToolResult } from "../utils/result";
import { gitTools } from "./git.tools";
import { hubV2Tools } from "./hub-v2";
import { logTools } from "./log.tools";
import { projectTools } from "./project.tools";
import { proxyTools } from "./proxy.tools";
import { runtimeTools } from "./runtime.tools";
import { taskTools } from "./task.tools";

export type McpToolDefinition<TSchema extends z.AnyZodObject = z.AnyZodObject> = {
  name: string;
  description: string;
  riskLevel: ToolRiskLevel;
  inputSchema: TSchema;
  handler(args: z.infer<TSchema>, context: ToolContext): Promise<ToolResult> | ToolResult;
};

export function allTools(): McpToolDefinition[] {
  return [
    ...projectTools(),
    ...taskTools(),
    ...logTools(),
    ...gitTools(),
    ...runtimeTools(),
    ...proxyTools(),
    ...hubV2Tools(),
  ];
}
