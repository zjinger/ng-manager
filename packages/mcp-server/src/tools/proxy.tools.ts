import { z } from "zod";
import type { McpToolDefinition } from "./index";
import { ok } from "../utils/result";

const proxyValidateSchema = z.object({
  configText: z.string().optional(),
}).strict();

export function proxyTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.proxy.list",
      description: "List current ng-manager Nginx/proxy binding, status, servers, and upstreams.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      async handler(_args, context) {
        const nginx = context.services.core.nginx;
        const instance = nginx.service.getInstance();
        const [status, servers, upstreams] = await Promise.all([
          nginx.service.getStatus().catch((error: unknown) => ({
            isRunning: false,
            error: error instanceof Error ? error.message : String(error),
          })),
          nginx.server.getAllServers().catch(() => []),
          nginx.module.getUpstreams().catch(() => []),
        ]);

        return ok("ngm.proxy.list", {
          instance,
          status,
          servers,
          upstreams,
        });
      },
    },
    {
      name: "ngm.proxy.validate",
      description: "Validate the current or supplied ng-manager Nginx/proxy config without reload.",
      riskLevel: "read",
      inputSchema: proxyValidateSchema,
      async handler(args, context) {
        const validation = await context.services.core.nginx.config.validateConfig(args.configText);
        return ok("ngm.proxy.validate", validation);
      },
    },
  ];
}
