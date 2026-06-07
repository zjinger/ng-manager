import { z } from "zod";
import { frontendWorkflowStatuses } from "./workflow-status";

export const frontendTaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(frontendWorkflowStatuses),
  projectId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict();

export type FrontendTask = z.infer<typeof frontendTaskSchema>;
