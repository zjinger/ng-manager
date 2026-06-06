import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context/tool-context";
import { assertToolPolicy } from "./policy/assert-tool-policy";
import { createDefaultToolPolicy } from "./policy/tool-policy";
import { allTools, type McpToolDefinition } from "./tools";
import { errorMessage, errorMetadata } from "./utils/errors";
import { fail, toMcpTextResult } from "./utils/result";

type McpToolHandler = (args: unknown) => Promise<ReturnType<typeof toMcpTextResult>>;
type RegisterToolCompat = (
  name: string,
  config: {
    description?: string;
    inputSchema?: McpToolDefinition["inputSchema"];
  },
  cb: (args: unknown) => Promise<ReturnType<typeof toMcpTextResult>>
) => unknown;
type RegisterToolServerCompat = {
  registerTool: RegisterToolCompat;
};

function registerMcpTool(server: Pick<McpServer, "registerTool">, tool: McpToolDefinition, handler: McpToolHandler): void {
  // Keep the MCP SDK compatibility boundary here. The SDK registerTool generic
  // type is intentionally broad and can over-expand with dynamically composed
  // Zod schemas, so registerTools() should not cast or bind it directly.
  const compatibleServer = server as unknown as RegisterToolServerCompat;
  compatibleServer.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.inputSchema,
    },
    async (args) => handler(args)
  );
}

export function registerTools(server: McpServer, context: ToolContext): void {
  const policy = createDefaultToolPolicy();

  for (const tool of allTools()) {
    registerMcpTool(
      server,
      tool,
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
