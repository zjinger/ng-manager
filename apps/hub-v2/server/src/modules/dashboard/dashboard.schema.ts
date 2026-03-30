import { z } from "zod";

export const dashboardBoardRangeSchema = z.enum(["7d", "30d"]);

export const dashboardBoardQuerySchema = z.object({
  projectId: z.string().trim().optional(),
  range: dashboardBoardRangeSchema.optional()
});

export type DashboardBoardQuery = z.infer<typeof dashboardBoardQuerySchema>;
