import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context/tool-context";
import { assertToolPolicy } from "./policy/assert-tool-policy";
import { createDefaultToolPolicy } from "./policy/tool-policy";
import { allTools } from "./tools";
import { errorMessage, errorMetadata } from "./utils/errors";
import { fail, toMcpTextResult } from "./utils/result";

type RegisterToolFn = (
  name: string,
  config: {
    description?: string;
    inputSchema?: unknown;
  },
  cb: (args: unknown) => Promise<ReturnType<typeof toMcpTextResult>>
) => void;

export function registerTools(server: McpServer, context: ToolContext): void {
  const policy = createDefaultToolPolicy();
  const registerTool = server.registerTool.bind(server) as RegisterToolFn;

  for (const tool of allTools()) {
    registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args) => {
        try {
          const parsed = tool.inputSchema.parse(args);
          const confirmed = tool.isConfirmed?.(parsed) ?? true;
          const isAllowedPreview = tool.allowPreviewWhenBlocked === true && !confirmed;
          if (!isAllowedPreview) {
            assertToolPolicy(policy, tool.name, tool.riskLevel);
          }
          const result = await tool.handler(parsed, context);
          return toMcpTextResult(result);
        } catch (error) {
          return toMcpTextResult(fail(tool.name, errorMessage(error), errorMetadata(error)));
        }
      }
    );
  }
}
