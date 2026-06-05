import { z } from "zod";

export const projectSelectorSchema = z.object({
  project: z.string().trim().min(1).optional(),
  projectKey: z.string().trim().min(1).optional(),
}).strict();

export const pagingSchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
}).strict();

export const docsListSchema = projectSelectorSchema.extend({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  keyword: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
}).strict();

export const docsGetSchema = projectSelectorSchema.extend({
  docId: z.string().trim().min(1),
}).strict();

export const docsGetBySlugSchema = projectSelectorSchema.extend({
  slug: z.string().trim().min(1),
  contentOnly: z.boolean().optional(),
}).strict();

export const issuesListSchema = projectSelectorSchema.extend({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
  keyword: z.string().trim().min(1).optional(),
  status: z.array(z.string().trim().min(1)).optional(),
  priority: z.array(z.string().trim().min(1)).optional(),
  assigneeId: z.string().trim().min(1).optional(),
  verifierId: z.string().trim().min(1).optional(),
  rdItemId: z.string().trim().min(1).optional(),
}).strict();

export const issueGetSchema = projectSelectorSchema.extend({
  issueId: z.string().trim().min(1),
}).strict();

const issueTypeSchema = z.enum(["bug", "feature", "change", "improvement", "task", "test"]);
const issuePrioritySchema = z.enum(["low", "medium", "high", "critical"]);

export const issueCreateSchema = projectSelectorSchema.extend({
  title: z.string().trim().min(1),
  description: z.string().optional(),
  type: issueTypeSchema.optional(),
  priority: issuePrioritySchema.optional(),
  assigneeId: z.string().trim().nullable().optional(),
  verifierId: z.string().trim().nullable().optional(),
  rdItemId: z.string().trim().nullable().optional(),
  moduleCode: z.string().trim().optional(),
  versionCode: z.string().trim().optional(),
  environmentCode: z.string().trim().optional(),
  confirm: z.boolean().optional(),
}).strict();

export const issueCommentSchema = projectSelectorSchema.extend({
  issueId: z.string().trim().min(1),
  content: z.string().min(1),
  mentions: z.array(z.string().trim().min(1)).optional(),
  confirm: z.boolean().optional(),
}).strict();

export const issueUpdateReservedSchema = projectSelectorSchema.extend({
  issueId: z.string().trim().min(1),
}).strict();

export const markdownImageUploadSchema = projectSelectorSchema.extend({
  filePath: z.string().trim().min(1).optional(),
  contentBase64: z.string().trim().min(1).optional(),
  fileName: z.string().trim().min(1).optional(),
  mimeType: z.string().trim().min(1).optional(),
  alt: z.string().trim().min(1).optional(),
}).strict();

export const rdListSchema = projectSelectorSchema.extend({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
  keyword: z.string().trim().min(1).optional(),
  stageId: z.string().trim().min(1).optional(),
  status: z.array(z.string().trim().min(1)).optional(),
  type: z.array(z.string().trim().min(1)).optional(),
  priority: z.array(z.string().trim().min(1)).optional(),
  assigneeId: z.string().trim().min(1).optional(),
}).strict();

export const rdGetSchema = projectSelectorSchema.extend({
  itemId: z.string().trim().min(1),
}).strict();

const rdTypeSchema = z.enum([
  "feature_dev",
  "tech_refactor",
  "integration",
  "env_setup",
  "bug_fix",
  "requirement_confirmation",
  "solution_design",
  "testing_validation",
  "delivery_launch",
  "project_closure",
]);

const rdPrioritySchema = z.enum(["low", "medium", "high", "critical"]);

const rdInitialStageTaskSchema = z.object({
  templateId: z.string().trim().min(1).nullable().optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  ownerId: z.string().trim().nullable().optional(),
  plannedStartAt: z.string().trim().nullable().optional(),
  plannedEndAt: z.string().trim().nullable().optional(),
}).strict();

const rdStageTaskTemplateSelectionSchema = z.object({
  templateId: z.string().trim().min(1),
  ownerId: z.string().trim().nullable().optional(),
}).strict();

export const rdCreateSchema = projectSelectorSchema.extend({
  title: z.string().trim().min(1),
  description: z.string().optional(),
  stageId: z.string().trim().nullable().optional(),
  type: rdTypeSchema.optional(),
  priority: rdPrioritySchema.optional(),
  memberIds: z.array(z.string().trim().min(1)).min(1),
  verifierId: z.string().trim().nullable().optional(),
  planStartAt: z.string().trim().optional(),
  planEndAt: z.string().trim().optional(),
  stageTasks: z.array(rdInitialStageTaskSchema).optional(),
  stageTaskTemplates: z.array(rdStageTaskTemplateSelectionSchema).optional(),
  confirm: z.boolean().optional(),
}).strict();

export const rdAdvanceStageSchema = projectSelectorSchema.extend({
  itemId: z.string().trim().min(1),
  stageId: z.string().trim().min(1),
  memberIds: z.array(z.string().trim().min(1)).optional(),
  description: z.string().trim().min(1).optional(),
  planStartAt: z.string().trim().min(1).optional(),
  planEndAt: z.string().trim().min(1).optional(),
  stageTasks: z.array(rdInitialStageTaskSchema).optional(),
  stageTaskTemplates: z.array(rdStageTaskTemplateSelectionSchema).optional(),
  confirm: z.boolean().optional(),
}).strict();

export const rdStageTasksListSchema = projectSelectorSchema.extend({
  itemId: z.string().trim().min(1),
}).strict();

export const rdStageTaskCreateSchema = projectSelectorSchema.extend({
  itemId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  ownerIds: z.array(z.string().trim().min(1)).min(1),
  plannedStartAt: z.string().trim().nullable().optional(),
  plannedEndAt: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().optional(),
  remark: z.string().trim().max(1000).nullable().optional(),
  confirm: z.boolean().optional(),
}).strict();

export const rdUpdateProgressSchema = projectSelectorSchema.extend({
  itemId: z.string().trim().min(1),
  progress: z.number().int().min(0).max(100),
  note: z.string().trim().optional(),
  blockReason: z.string().trim().min(1).max(500).optional(),
  resolveBlockId: z.string().trim().min(1).optional(),
  stageTaskId: z.string().trim().min(1).optional(),
  confirm: z.boolean().optional(),
}).strict();
