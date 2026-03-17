import { z } from "zod";

export const rdItemTypeSchema = z.enum(["feature_dev", "tech_refactor", "integration", "env_setup"]);
export const rdItemStatusSchema = z.enum(["todo", "doing", "blocked", "done", "canceled"]);
export const rdItemPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

const operatorSchema = z.object({
  operatorId: z.string().trim().max(64).nullable().optional(),
  operatorName: z.string().trim().min(1).max(120).nullable().optional()
});

export const rdStageParamsSchema = z.object({
  projectId: z.string().trim().min(1).max(64),
  stageId: z.string().trim().min(1).max(64)
});

export const rdItemParamsSchema = z.object({
  projectId: z.string().trim().min(1).max(64),
  id: z.string().trim().min(1).max(64)
});

export const listRdItemsQuerySchema = z.object({
  projectId: z.string().trim().max(64).optional(),
  stageId: z.string().trim().max(64).optional(),
  status: rdItemStatusSchema.optional(),
  priority: rdItemPrioritySchema.optional(),
  type: rdItemTypeSchema.optional(),
  assigneeId: z.string().trim().max(64).optional(),
  overdue: z.coerce.boolean().optional(),
  keyword: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const createRdStageSchema = operatorSchema.extend({
  name: z.string().trim().min(1).max(80),
  sort: z.coerce.number().int().min(0).max(9999).optional(),
  enabled: z.boolean().optional()
});

export const updateRdStageSchema = operatorSchema.extend({
  name: z.string().trim().min(1).max(80).optional(),
  sort: z.coerce.number().int().min(0).max(9999).optional(),
  enabled: z.boolean().optional()
});

export const createRdItemSchema = operatorSchema.extend({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000).optional(),
  stageId: z.string().trim().min(1).max(64),
  type: rdItemTypeSchema.optional(),
  status: rdItemStatusSchema.optional(),
  priority: rdItemPrioritySchema.optional(),
  assigneeId: z.string().trim().min(1).max(64).nullable().optional(),
  reviewerId: z.string().trim().min(1).max(64).nullable().optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  planStartAt: z.string().trim().max(40).nullable().optional(),
  planEndAt: z.string().trim().max(40).nullable().optional(),
  blockerReason: z.string().trim().max(4000).nullable().optional()
});

export const updateRdItemSchema = operatorSchema.extend({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(10000).optional(),
  stageId: z.string().trim().min(1).max(64).optional(),
  type: rdItemTypeSchema.optional(),
  priority: rdItemPrioritySchema.optional(),
  assigneeId: z.string().trim().min(1).max(64).nullable().optional(),
  reviewerId: z.string().trim().min(1).max(64).nullable().optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  planStartAt: z.string().trim().max(40).nullable().optional(),
  planEndAt: z.string().trim().max(40).nullable().optional(),
  blockerReason: z.string().trim().max(4000).nullable().optional()
});

export const changeRdItemStatusSchema = operatorSchema.extend({
  status: rdItemStatusSchema,
  blockerReason: z.string().trim().max(4000).nullable().optional()
});

export const updateRdItemProgressSchema = operatorSchema.extend({
  progress: z.coerce.number().int().min(0).max(100)
});

export const addRdCommentSchema = operatorSchema.extend({
  content: z.string().trim().min(1).max(4000)
});
