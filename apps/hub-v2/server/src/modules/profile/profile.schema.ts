import { z } from "zod";

const boolMapSchema = z.record(z.string(), z.boolean());

export const listProfileActivitiesQuerySchema = z.object({
  days: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  kind: z.enum(["issue_activity", "rd_activity"]).optional()
});

export const updateProfileNotificationPrefsSchema = z.object({
  channels: boolMapSchema,
  events: boolMapSchema,
  projectScopeMode: z.enum(["all_accessible", "member_only"]).optional(),
  includeArchivedProjects: z.boolean().optional()
});
