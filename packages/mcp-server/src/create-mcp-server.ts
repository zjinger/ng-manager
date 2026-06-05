import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context/tool-context";
import { registerTools } from "./register-tools";

export function createMcpServer(context: ToolContext): McpServer {
  const server = new McpServer(
    { name: "ng-manager", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );
  registerTools(server, context);
  return server;
}
