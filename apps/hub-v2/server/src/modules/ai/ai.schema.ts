import { z } from "zod";

const aiIssueTypeSchema = z.enum(["bug", "feature", "change", "improvement", "task", "test"]);

export const aiIssueRecommendInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  projectId: z.string().trim().min(1)
});

export const aiAssigneeRecommendInputSchema = aiIssueRecommendInputSchema.extend({
  type: aiIssueTypeSchema.optional(),
  moduleCode: z.string().trim().max(120).optional().nullable()
});

export const aiReportSqlInputSchema = z.object({
  query: z.string().trim().min(1).max(500)
});

export const aiReportTemplateCreateInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  naturalQuery: z.string().trim().min(1).max(500),
  sql: z.string().trim().min(1).max(10000)
});

export const aiReportTemplateUpdateInputSchema = z.object({
  title: z.string().trim().min(1).max(120)
});

export const aiReportTemplateIdParamSchema = z.object({
  id: z.string().trim().min(1).max(80)
});
