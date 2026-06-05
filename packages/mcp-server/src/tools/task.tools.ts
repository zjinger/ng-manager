import { z } from "zod";
import type { McpToolDefinition } from "./index";
import { ok } from "../utils/result";

const taskListSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
}).strict();

const taskStatusSchema = z.object({
  taskId: z.string().trim().min(1),
}).strict();

export function taskTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.task.list",
      description: "List registered task views for a project, or active tasks when projectId is omitted.",
      riskLevel: "read",
      inputSchema: taskListSchema,
      async handler(args, context) {
        if (args.projectId) {
          const rows = await context.services.core.task.listViewsByProject(args.projectId);
          return ok("ngm.task.list", rows);
        }
        const activeTasks = await context.services.core.task.listActive();
        return ok("ngm.task.list", activeTasks);
      },
    },
    {
      name: "ngm.task.getStatus",
      description: "Get the runtime status for a registered task.",
      riskLevel: "read",
      inputSchema: taskStatusSchema,
      async handler(args, context) {
        const runtime = await context.services.core.task.status(args.taskId);
        return ok("ngm.task.getStatus", runtime);
      },
    },
  ];
}
