import { z } from "zod";

const jsonPayloadSchema = z.unknown();

export const createDeliveryWeeklyReportSchema = z.object({
  projectId: z.string().trim().min(1),
  projectKey: z.string().trim().min(1),
  projectName: z.string().trim().min(1),
  periodStart: z.string().trim().min(1),
  periodEnd: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: jsonPayloadSchema,
  metrics: jsonPayloadSchema,
  stages: jsonPayloadSchema,
  keyItems: jsonPayloadSchema,
  attentions: jsonPayloadSchema
});

export const listDeliveryWeeklyReportsQuerySchema = z.object({
  projectId: z.string().trim().min(1),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional()
});
