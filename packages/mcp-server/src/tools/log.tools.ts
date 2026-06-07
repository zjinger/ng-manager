import type { SystemLogFilter } from "@yinuo-ngm/logger";
import { z } from "zod";
import type { McpToolDefinition } from "./index";
import { ok } from "../utils/result";

const logTailSchema = z.object({
  runId: z.string().trim().min(1).optional(),
  taskId: z.string().trim().min(1).optional(),
  tail: z.number().int().min(1).max(500).optional(),
}).strict();

const logSearchSchema = z.object({
  query: z.string().trim().min(1),
  limit: z.number().int().min(1).max(200).optional(),
  source: z.string().trim().min(1).optional(),
  scope: z.string().trim().min(1).optional(),
}).strict();

function clampTail(value: number | undefined): number {
  return Math.min(Math.max(value ?? 100, 1), 500);
}

function clampSearchLimit(value: number | undefined): number {
  return Math.min(Math.max(value ?? 50, 1), 200);
}

export function logTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm_log_tail",
      description: "Read recent task logs by runId or taskId.",
      riskLevel: "read",
      inputSchema: logTailSchema,
      async handler(args, context) {
        const tail = clampTail(args.tail);
        let runId = args.runId;
        const localServer = context.services.localServer;
        const availability = localServer ? await localServer.availability() : { available: false, reason: "local server client is not configured" };

        if (!runId && args.taskId) {
          if (!availability.available || !localServer) {
            return ok("ngm_log_tail", {
              controlPlane: "unavailable",
              localServer: availability,
              status: "unavailable",
              reason: "ng-manager local server is not running; start it with ngm server or ngm ui to read shared task logs",
              taskId: args.taskId,
              tail,
              lines: [],
            });
          }
          const snapshot = await localServer.getTaskStatus(args.taskId);
          runId = snapshot?.runId;
        }

        if (!runId) {
          throw new Error("runId or taskId is required");
        }

        if (!availability.available || !localServer) {
          return ok("ngm_log_tail", {
            controlPlane: "unavailable",
            localServer: availability,
            status: "unavailable",
            reason: "ng-manager local server is not running; start it with ngm server or ngm ui to read shared task logs",
            runId,
            tail,
            lines: [],
          });
        }
        const controlPlane = "local-server";
        const lines = await localServer.getTaskLogTail(runId, tail);
        return ok("ngm_log_tail", {
          controlPlane,
          localServer: availability,
          runId,
          tail,
          lines,
        });
      },
    },
    {
      name: "ngm_log_search",
      description: "Search recent ng-manager system logs by keyword.",
      riskLevel: "read",
      inputSchema: logSearchSchema,
      async handler(args, context) {
        const limit = clampSearchLimit(args.limit);
        const filter: SystemLogFilter = {
          ...(args.source ? { source: args.source as SystemLogFilter["source"] } : {}),
          ...(args.scope ? { scope: args.scope as SystemLogFilter["scope"] } : {}),
        };
        const needle = args.query.toLowerCase();
        const entries = context.services.core.sysLog
          .query(filter, { limit: 10000 })
          .filter((entry) => {
            const text = `${entry.text} ${JSON.stringify(entry.data ?? {})}`.toLowerCase();
            return text.includes(needle);
          })
          .slice(0, limit);

        return ok("ngm_log_search", {
          query: args.query,
          limit,
          entries,
        });
      },
    },
  ];
}
