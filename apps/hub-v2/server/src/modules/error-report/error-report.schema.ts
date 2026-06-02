import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null);

export const clientErrorReportLevelSchema = z.enum(["info", "warn", "error"]);

export const createClientErrorReportSchema = z.object({
  level: clientErrorReportLevelSchema,
  type: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(2000),
  stack: optionalText(12000),
  source: optionalText(1000),
  lineno: z.number().int().min(0).max(10000000).optional().nullable(),
  colno: z.number().int().min(0).max(10000000).optional().nullable(),
  url: optionalText(2000),
  route: optionalText(1000),
  appVersion: optionalText(120),
  buildHash: optionalText(160),
  requestMethod: optionalText(20),
  requestUrl: optionalText(2000),
  statusCode: z.number().int().min(0).max(999).optional().nullable(),
  extra: z.record(z.unknown()).optional().nullable()
});

const optionalDateString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

export const listClientErrorReportsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  keyword: z.string().trim().max(200).optional().transform((value) => value || undefined),
  level: clientErrorReportLevelSchema.optional(),
  type: z.string().trim().max(80).optional().transform((value) => value || undefined),
  dateFrom: optionalDateString,
  dateTo: optionalDateString
});
