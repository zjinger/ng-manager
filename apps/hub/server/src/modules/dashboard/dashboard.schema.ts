import { z } from "zod";
import { DASHBOARD_STAT_CARD_KEYS } from "./dashboard.types";

const dashboardStatCardFiltersSchema = z.object({
  priorityScope: z.enum(["all", "high_up", "critical"]).optional(),
  projectIds: z.array(z.string().trim().min(1)).max(100).optional()
});

export const updateDashboardPreferencesSchema = z.object({
  cards: z.array(
    z.object({
      key: z.enum(DASHBOARD_STAT_CARD_KEYS),
      enabled: z.boolean(),
      order: z.number().int().min(1).max(50),
      filters: dashboardStatCardFiltersSchema.optional()
    })
  ).min(1)
});
