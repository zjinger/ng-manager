import { z } from "zod";

export const createRdStageSchema = z.object({
  projectId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  sort: z.coerce.number().int().optional()
});

export const updateRdStageSchema = z.object({
  name: z.string().trim().optional(),
  sort: z.coerce.number().int().optional(),
  enabled: z.boolean().optional()
});

export const listRdStagesQuerySchema = z.object({
  projectId: z.string().trim().min(1)
});

export const createRdItemSchema = z.object({
  projectId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().optional(),
  stageId: z.string().trim().nullable().optional(),
  type: z.enum(["feature_dev", "tech_refactor", "integration", "env_setup"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigneeId: z.string().trim().nullable().optional(),
  reviewerId: z.string().trim().nullable().optional(),
  planStartAt: z.string().trim().optional(),
  planEndAt: z.string().trim().optional()
});

export const updateRdItemSchema = z.object({
  title: z.string().trim().optional(),
  description: z.string().nullable().optional(),
  stageId: z.string().trim().nullable().optional(),
  type: z.enum(["feature_dev", "tech_refactor", "integration", "env_setup"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigneeId: z.string().trim().nullable().optional(),
  reviewerId: z.string().trim().nullable().optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  planStartAt: z.string().trim().nullable().optional(),
  planEndAt: z.string().trim().nullable().optional()
});

export const blockRdItemSchema = z.object({
  blockerReason: z.string().optional()
});

export const advanceRdStageSchema = z.object({
  stageId: z.string().trim().min(1)
});

export const listRdItemsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  projectId: z.string().trim().optional(),
  stageId: z.string().trim().optional(),
  status: z.enum(["todo", "doing", "blocked", "done", "accepted", "closed"]).optional(),
  type: z.enum(["feature_dev", "tech_refactor", "integration", "env_setup"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigneeId: z.string().trim().optional(),
  keyword: z.string().trim().optional()
});
