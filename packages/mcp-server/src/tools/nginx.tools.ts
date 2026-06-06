import { z } from "zod";
import { ok } from "../utils/result";
import type { McpToolDefinition } from "./index";

const nginxServerGetSchema = z.object({
  id: z.string().trim().min(1),
}).strict();

const nginxValidateSchema = z.object({
  configText: z.string().optional(),
}).strict();

const nginxLogsTailSchema = z.object({
  type: z.enum(["access", "error"]).optional(),
  tail: z.number().int().min(1).max(1000).optional(),
}).strict();

function clampTail(value: number | undefined): number {
  return Math.min(Math.max(value ?? 100, 1), 1000);
}

export function nginxTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.nginx.status",
      description: "Read local ng-manager Nginx binding and process status without starting, stopping, or reloading it.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      async handler(_args, context) {
        const nginx = context.services.core.nginx;
        const instance = nginx.service.getInstance();
        const status = await nginx.service.getStatus().catch((error: unknown) => ({
          isRunning: false,
          error: error instanceof Error ? error.message : String(error),
        }));
        return ok("ngm.nginx.status", {
          instance,
          status,
          lastConfigAppliedAt: nginx.service.getLastConfigAppliedAt(),
        });
      },
    },
    {
      name: "ngm.nginx.servers.list",
      description: "List local ng-manager Nginx server blocks without changing Nginx config.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      async handler(_args, context) {
        const servers = await context.services.core.nginx.server.getAllServers();
        return ok("ngm.nginx.servers.list", servers);
      },
    },
    {
      name: "ngm.nginx.server.get",
      description: "Get one local ng-manager Nginx server block by id.",
      riskLevel: "read",
      inputSchema: nginxServerGetSchema,
      async handler(args, context) {
        const server = await context.services.core.nginx.server.getServer(args.id);
        if (!server) {
          throw new Error(`Nginx server not found: ${args.id}`);
        }
        return ok("ngm.nginx.server.get", server);
      },
    },
    {
      name: "ngm.nginx.upstreams.list",
      description: "List local ng-manager Nginx upstream definitions without saving changes.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      async handler(_args, context) {
        const upstreams = await context.services.core.nginx.module.getUpstreams();
        return ok("ngm.nginx.upstreams.list", upstreams);
      },
    },
    {
      name: "ngm.nginx.config.validate",
      description: "Validate the current or supplied local ng-manager Nginx config without reload.",
      riskLevel: "read",
      inputSchema: nginxValidateSchema,
      async handler(args, context) {
        const validation = await context.services.core.nginx.config.validateConfig(args.configText);
        return ok("ngm.nginx.config.validate", validation);
      },
    },
    {
      name: "ngm.nginx.config.getMain",
      description: "Read local ng-manager Nginx main config metadata and content without writing it.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      async handler(_args, context) {
        const config = await context.services.core.nginx.config.readMainConfig();
        return ok("ngm.nginx.config.getMain", config);
      },
    },
    {
      name: "ngm.nginx.logs.tail",
      description: "Read recent local ng-manager Nginx access or error log lines.",
      riskLevel: "read",
      inputSchema: nginxLogsTailSchema,
      async handler(args, context) {
        const type = args.type ?? "error";
        const tail = clampTail(args.tail);
        const lines = await context.services.core.nginx.log.readLogTail(type, tail);
        return ok("ngm.nginx.logs.tail", {
          type,
          tail,
          logPath: context.services.core.nginx.log.getLogFilePath(type),
          lines,
        });
      },
    },
  ];
}
