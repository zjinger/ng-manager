import { z } from "zod";
import { frontendWorkflowStatuses } from "./workflow-status";

export const workflowCheckStatusSchema = z.enum(["pending", "passed", "warning", "failed", "blocked"]);

export const workflowChecksSchema = z.object({
  standard: workflowCheckStatusSchema,
  test: workflowCheckStatusSchema,
  review: workflowCheckStatusSchema,
  build: workflowCheckStatusSchema,
}).strict();

export const frontendTaskSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(frontendWorkflowStatuses),
  projectId: z.string().optional(),
  projectRoot: z.string(),
  title: z.string().min(1),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  designContextPath: z.string().nullable(),
  changedFiles: z.array(z.string()),
  checks: workflowChecksSchema,
}).strict();

export type FrontendTask = z.infer<typeof frontendTaskSchema>;
export type WorkflowCheckStatus = z.infer<typeof workflowCheckStatusSchema>;
export type WorkflowChecks = z.infer<typeof workflowChecksSchema>;
