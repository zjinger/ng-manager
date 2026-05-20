import { z } from "zod";
import { DASHBOARD_WIDGET_KEYS } from "./dashboard.types";

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

export const dashboardReportedIssuesPageQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  projectId: z.string().trim().optional()
});

export type DashboardReportedIssuesPageQuery = z.infer<typeof dashboardReportedIssuesPageQuerySchema>;

export const updateDashboardPreferencesSchema = z.object({
  widgets: z.array(
    z.object({
      key: z.enum(DASHBOARD_WIDGET_KEYS),
      visible: z.boolean(),
      order: z.coerce.number().int().min(1).max(100)
    })
  ).min(1)
});

export type UpdateDashboardPreferencesBody = z.infer<typeof updateDashboardPreferencesSchema>;
