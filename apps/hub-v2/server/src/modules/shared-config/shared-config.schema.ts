import { z } from "zod";

export const createSharedConfigSchema = z.object({
  projectId: z.string().trim().optional().nullable(),
  scope: z.enum(["global", "project"]).optional(),
  configKey: z.string().trim().min(1),
  configName: z.string().trim().min(1),
  category: z.string().trim().optional(),
  valueType: z.string().trim().optional(),
  configValue: z.string().min(1),
  description: z.string().trim().optional(),
  isEncrypted: z.boolean().optional(),
  priority: z.coerce.number().int().optional()
});

export const updateSharedConfigSchema = z.object({
  projectId: z.string().trim().optional().nullable(),
  scope: z.enum(["global", "project"]).optional(),
  configName: z.string().trim().optional(),
  category: z.string().trim().optional(),
  valueType: z.string().trim().optional(),
  configValue: z.string().optional(),
  description: z.string().trim().nullable().optional(),
  isEncrypted: z.boolean().optional(),
  priority: z.coerce.number().int().optional(),
  status: z.enum(["active", "inactive"]).optional()
});

export const listSharedConfigsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  scope: z.enum(["global", "project"]).optional(),
  projectId: z.string().trim().optional(),
  category: z.string().trim().optional()
});

export const publicSharedConfigsQuerySchema = z.object({
  projectId: z.string().trim().optional(),
  category: z.string().trim().optional()
});
