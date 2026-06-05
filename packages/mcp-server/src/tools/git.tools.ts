import { z } from "zod";
import type { McpToolDefinition } from "./index";
import { ok } from "../utils/result";

const gitProjectSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectPath: z.string().trim().min(1).optional(),
}).strict();

const gitDiffSchema = gitProjectSchema.extend({
  maxBytes: z.number().int().min(1).max(200000).optional(),
}).strict();

export function gitTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.git.status",
      description: "Read Git working tree status for a project. This MVP uses a core Git service stub.",
      riskLevel: "read",
      inputSchema: gitProjectSchema,
      async handler(args, context) {
        const data = await context.services.git.status(args);
        return ok("ngm.git.status", data);
      },
    },
    {
      name: "ngm.git.diff",
      description: "Read Git diff for a project. This MVP uses a core Git service stub.",
      riskLevel: "read",
      inputSchema: gitDiffSchema,
      async handler(args, context) {
        const data = await context.services.git.diff(args);
        return ok("ngm.git.diff", data);
      },
    },
  ];
}
