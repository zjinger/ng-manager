import { z } from "zod";

export const dashboardBoardRangeSchema = z.enum(["7d", "30d"]);

export const dashboardBoardQuerySchema = z.object({
  projectId: z.string().trim().optional(),
  range: dashboardBoardRangeSchema.optional()
});

export type DashboardBoardQuery = z.infer<typeof dashboardBoardQuerySchema>;

export const dashboardTodosPageQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  projectId: z.string().trim().optional(),
  kind: z
    .enum(["issue_assigned", "issue_collaborating", "issue_verify", "rd_assigned", "rd_verify"])
    .optional()
});

export type DashboardTodosPageQuery = z.infer<typeof dashboardTodosPageQuerySchema>;
