import { z } from "zod";

export const auditLogModuleSchema = z.enum(["user", "organization", "title", "role", "permission", "settings"]);
export const auditLogActionSchema = z.enum(["create", "update", "delete", "enable", "disable", "reset", "assign", "remove"]);
export const auditLogLevelSchema = z.enum(["info", "warn", "error"]);

const optionalDateString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  keyword: z.string().trim().optional().transform((value) => value || undefined),
  module: auditLogModuleSchema.optional(),
  action: auditLogActionSchema.optional(),
  level: auditLogLevelSchema.optional(),
  actorId: z.string().trim().optional().transform((value) => value || undefined),
  dateFrom: optionalDateString,
  dateTo: optionalDateString
});
