#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createToolContext } from "./context/create-tool-context";
import { createMcpServer } from "./create-mcp-server";
import { errorMessage } from "./utils/errors";

export { createDoctorReport, doctor } from "./doctor";

export async function main(): Promise<void> {
  const context = await createToolContext();
  const server = createMcpServer(context);

  const cleanup = async () => {
    await context.dispose();
  };

  process.once("SIGINT", () => {
    void cleanup().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void cleanup().finally(() => process.exit(0));
  });

  await server.connect(new StdioServerTransport());
}

if (require.main === module) {
  main().catch((error: unknown) => {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exit(1);
  });
}
