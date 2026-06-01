import { z } from "zod";

const optionalDateString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

export const listPersonalApiTokenAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  tokenId: z.string().trim().optional().transform((value) => value || undefined),
  action: z.string().trim().max(80).optional().transform((value) => value || undefined),
  projectKey: z.string().trim().max(80).optional().transform((value) => value || undefined),
  dateFrom: optionalDateString,
  dateTo: optionalDateString
});
