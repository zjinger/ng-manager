import { doctor as runMcpDoctor, main as startMcpServer } from "@yinuo-ngm/mcp-server";

export type McpCommandDeps = {
    startServer(): Promise<void>;
};

export type McpDoctorCommandDeps = {
    doctor(): Promise<void>;
};

export function createMcpCmd(deps: McpCommandDeps = { startServer: startMcpServer }) {
    return async function mcpCmd(): Promise<void> {
        await deps.startServer();
    };
}

export function createMcpDoctorCmd(deps: McpDoctorCommandDeps = { doctor: runMcpDoctor }) {
    return async function mcpDoctorCmd(): Promise<void> {
        await deps.doctor();
    };
}

export const mcpCmd = createMcpCmd();
export const mcpDoctorCmd = createMcpDoctorCmd();
