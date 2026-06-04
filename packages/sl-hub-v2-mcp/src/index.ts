#!/usr/bin/env node
import { docsTools } from "./tools/docs";
import { issueTools } from "./tools/issues";
import { personalTools } from "./tools/personal";
import { rdTools } from "./tools/rd";
import { ToolDefinition } from "./tool";

type SdkServer = {
  setRequestHandler(schema: unknown, handler: (request: { params?: Record<string, unknown> }) => Promise<unknown> | unknown): void;
  connect(transport: unknown): Promise<void>;
};

type RuntimeSdk = {
  Server: new (info: { name: string; version: string }, options: Record<string, unknown>) => SdkServer;
  StdioServerTransport: new () => unknown;
  ListToolsRequestSchema: unknown;
  CallToolRequestSchema: unknown;
};

export function allTools(): ToolDefinition[] {
  return [...personalTools(), ...docsTools(), ...issueTools(), ...rdTools()];
}

export function createServer(runtime: RuntimeSdk = loadRuntimeSdk()): SdkServer {
  const tools = allTools();
  const server = new runtime.Server(
    { name: "sl-hub-v2", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(runtime.ListToolsRequestSchema, () => ({
    tools: tools.map(({ handler: _handler, ...tool }) => tool),
  }));

  server.setRequestHandler(runtime.CallToolRequestSchema, async (request) => {
    const params = request.params ?? {};
    const name = typeof params.name === "string" ? params.name : "";
    const tool = tools.find((item) => item.name === name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    const payload = await tool.handler((params.arguments as Record<string, unknown> | undefined) ?? {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  });

  return server;
}

export async function main(): Promise<void> {
  const runtime = loadRuntimeSdk();
  const server = createServer(runtime);
  await server.connect(new runtime.StdioServerTransport());
}

function loadRuntimeSdk(): RuntimeSdk {
  // Keep SDK types out of the TypeScript compile graph; the runtime API is stable for these primitives.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ListToolsRequestSchema, CallToolRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
  return { Server, StdioServerTransport, ListToolsRequestSchema, CallToolRequestSchema };
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
