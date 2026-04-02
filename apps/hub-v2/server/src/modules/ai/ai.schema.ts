import { z } from "zod";

export const aiIssueRecommendInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  projectId: z.string().trim().min(1)
});

export const aiReportSqlInputSchema = z.object({
  query: z.string().trim().min(1).max(500)
});
