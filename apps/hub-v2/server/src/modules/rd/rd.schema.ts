import { z } from "zod";
const rdStatusSchema = z.enum(["todo", "doing", "blocked", "done", "accepted", "closed"]);
const rdTypeSchema = z.enum([
  "feature_dev",
  "tech_refactor",
  "integration",
  "env_setup",
  "requirement_confirmation",
  "solution_design",
  "testing_validation",
  "delivery_launch",
  "project_closure",
]);
const rdPrioritySchema = z.enum(["low", "medium", "high", "critical"]);

function csvEnumArray<T extends [string, ...string[]]>(values: T) {
  const itemSchema = z.enum(values);
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return [];
    }
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(itemSchema).optional());
}

function csvStringArray() {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return [];
    }
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(z.string().trim().min(1)).optional());
}

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
  type: rdTypeSchema.optional(),
  priority: rdPrioritySchema.optional(),
  memberIds: z.array(z.string().trim().min(1)).min(1),
  verifierId: z.string().trim().nullable().optional(),
  planStartAt: z.string().trim().optional(),
  planEndAt: z.string().trim().optional()
});

export const updateRdItemSchema = z.object({
  version: z.coerce.number().int().min(1),
  title: z.string().trim().optional(),
  description: z.string().nullable().optional(),
  stageId: z.string().trim().nullable().optional(),
  type: rdTypeSchema.optional(),
  priority: rdPrioritySchema.optional(),
  memberIds: z.array(z.string().trim().min(1)).min(1).optional(),
  verifierId: z.string().trim().nullable().optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  planStartAt: z.string().trim().nullable().optional(),
  planEndAt: z.string().trim().nullable().optional()
});

export const blockRdItemSchema = z.object({
  blockerReason: z.string().optional()
});

export const closeRdItemSchema = z.object({
  reason: z.string().trim().optional()
});

export const advanceRdStageSchema = z.object({
  stageId: z.string().trim().min(1),
  memberIds: z.array(z.string().trim().min(1)).min(1).optional()
});

export const listRdItemsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  projectId: z.string().trim().optional(),
  stageId: z.string().trim().optional(),
  stageIds: csvStringArray(),
  status: csvEnumArray(["todo", "doing", "blocked", "done", "accepted", "closed"]),
  type: csvEnumArray([
    "feature_dev",
    "tech_refactor",
    "integration",
    "env_setup",
    "requirement_confirmation",
    "solution_design",
    "testing_validation",
    "delivery_launch",
    "project_closure",
  ]),
  priority: csvEnumArray(["low", "medium", "high", "critical"]),
  assigneeIds: csvStringArray(),
  assigneeId: z.string().trim().optional(),
keyword: z.string().trim().optional()
});

export const updateRdItemProgressSchema = z.object({
  progress: z.coerce.number().int().min(0).max(100),
  note: z.string().trim().optional(),
});
