import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context/tool-context";
import { assertToolPolicy } from "./policy/assert-tool-policy";
import { createDefaultToolPolicy } from "./policy/tool-policy";
import { allTools, type McpToolDefinition } from "./tools";
import { errorMessage, errorMetadata } from "./utils/errors";
import { fail, toMcpTextResult, type ToolResult } from "./utils/result";
import { shouldAuditTool, writeAuditLog } from "./audit/audit-log.service";

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
        const startedAt = Date.now();
        let parsed: unknown;
        let result: ToolResult | undefined;
        try {
          parsed = tool.inputSchema.parse(args);
          const parsedArgs = parsed as Record<string, unknown>;
          const confirmed = tool.isConfirmed?.(parsedArgs) ?? true;
          const isAllowedPreview = tool.allowPreviewWhenBlocked === true && (!confirmed || tool.deferPolicyToHandler === true);
          if (!isAllowedPreview) {
            assertToolPolicy(policy, tool.name, tool.riskLevel);
          }
          result = await tool.handler(parsedArgs, context);
          if (shouldAuditTool(tool.name, tool.riskLevel)) {
            try {
              await writeAuditLog(context, {
                tool: tool.name,
                riskLevel: tool.riskLevel,
                args: parsed,
                result,
                durationMs: Date.now() - startedAt,
              });
            } catch {
              // Keep tool responses stable if audit storage is temporarily unavailable.
            }
          }
          return toMcpTextResult(result);
        } catch (error) {
          result = fail(tool.name, errorMessage(error), errorMetadata(error));
          if (shouldAuditTool(tool.name, tool.riskLevel)) {
            try {
              await writeAuditLog(context, {
                tool: tool.name,
                riskLevel: tool.riskLevel,
                args: parsed ?? args,
                result,
                error,
                durationMs: Date.now() - startedAt,
              });
            } catch {
              // Keep tool responses stable if audit storage is temporarily unavailable.
            }
          }
          return toMcpTextResult(result);
        }
      }
    );
  }
}
