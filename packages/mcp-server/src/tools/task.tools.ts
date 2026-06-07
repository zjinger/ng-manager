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
      name: "ngm_task_list",
      description: "List registered task views for a project, or active tasks when projectId is omitted.",
      riskLevel: "read",
      inputSchema: taskListSchema,
      async handler(args, context) {
        const localServer = context.services.localServer;
        const availability = localServer ? await localServer.availability() : { available: false, reason: "local server client is not configured" };
        if (availability.available && localServer) {
          if (args.projectId) {
            const rows = await localServer.listTaskViews(args.projectId);
            return ok("ngm_task_list", {
              controlPlane: "local-server",
              localServer: availability,
              rows,
            });
          }
          const activeTasks = await localServer.listActiveTasks();
          return ok("ngm_task_list", {
            controlPlane: "local-server",
            localServer: availability,
            activeTasks,
          });
        }

        return ok("ngm_task_list", {
          controlPlane: "unavailable",
          localServer: availability,
          status: "unavailable",
          reason: "ng-manager local server is not running; start it with ngm server or ngm ui to inspect shared task state",
          rows: args.projectId ? [] : undefined,
          activeTasks: args.projectId ? undefined : [],
        });
      },
    },
    {
      name: "ngm_task_get_status",
      description: "Get the runtime status for a registered task.",
      riskLevel: "read",
      inputSchema: taskStatusSchema,
      async handler(args, context) {
        const localServer = context.services.localServer;
        const availability = localServer ? await localServer.availability() : { available: false, reason: "local server client is not configured" };
        if (availability.available && localServer) {
          const runtime = await localServer.getTaskStatus(args.taskId);
          return ok("ngm_task_get_status", {
            controlPlane: "local-server",
            localServer: availability,
            runtime,
          });
        }

        return ok("ngm_task_get_status", {
          controlPlane: "unavailable",
          localServer: availability,
          status: "unavailable",
          reason: "ng-manager local server is not running; start it with ngm server or ngm ui to inspect shared task state",
          taskId: args.taskId,
        });
      },
    },
  ];
}
