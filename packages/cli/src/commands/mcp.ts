import { main as startMcpServer } from "@yinuo-ngm/mcp-server";

export type McpCommandDeps = {
    startServer(): Promise<void>;
};

export function createMcpCmd(deps: McpCommandDeps = { startServer: startMcpServer }) {
    return async function mcpCmd(): Promise<void> {
        await deps.startServer();
    };
}

export const mcpCmd = createMcpCmd();
