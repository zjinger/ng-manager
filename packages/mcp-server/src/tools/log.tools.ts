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
      name: "ngm.log.tail",
      description: "Read recent task logs by runId or taskId.",
      riskLevel: "read",
      inputSchema: logTailSchema,
      async handler(args, context) {
        const tail = clampTail(args.tail);
        let runId = args.runId;

        if (!runId && args.taskId) {
          const snapshot = await context.services.core.task.getSnapshotByTaskId(args.taskId);
          runId = snapshot?.runId;
        }

        if (!runId) {
          throw new Error("runId or taskId is required");
        }

        const lines = await context.services.core.task.getTailLogsByRun(runId, tail);
        return ok("ngm.log.tail", {
          runId,
          tail,
          lines,
        });
      },
    },
    {
      name: "ngm.log.search",
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

        return ok("ngm.log.search", {
          query: args.query,
          limit,
          entries,
        });
      },
    },
  ];
}
