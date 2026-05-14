import { z } from "zod";

const claimTypeSchema = z.enum(["travel", "general"]);
const claimStatusSchema = z.enum(["draft", "submitted", "approving", "rejected", "completed", "cancelled"]);
const attachmentCategorySchema = z.enum(["invoice", "itinerary", "payment_proof", "other"]);

const amountSchema = z.coerce.number().finite().min(0).max(999999999);

export const reimbursementItemSchema = z.object({
  itemType: z.enum(["travel", "general"]).optional(),
  category: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  occurredDate: z.string().trim().nullable().optional(),
  startDate: z.string().trim().nullable().optional(),
  endDate: z.string().trim().nullable().optional(),
  fromLocation: z.string().trim().nullable().optional(),
  toLocation: z.string().trim().nullable().optional(),
  amount: amountSchema.optional(),
  meta: z.record(z.unknown()).nullable().optional(),
  sort: z.coerce.number().int().min(0).optional()
});

export const createReimbursementClaimSchema = z.object({
  claimType: claimTypeSchema,
  departmentId: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(255),
  fillDate: z.string().trim().optional(),
  advanceAmount: amountSchema.optional(),
  items: z.array(reimbursementItemSchema).optional()
});

export const updateReimbursementClaimSchema = z.object({
  departmentId: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(1).max(255).optional(),
  fillDate: z.string().trim().optional(),
  advanceAmount: amountSchema.optional(),
  items: z.array(reimbursementItemSchema).optional()
});

export const listReimbursementClaimsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  scope: z.enum(["my", "all", "todo"]).optional(),
  claimType: z.union([claimTypeSchema, z.literal("")]).optional(),
  status: z.union([claimStatusSchema, z.literal("")]).optional(),
  departmentId: z.string().trim().optional(),
  keyword: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional()
});

export const reimbursementStatsQuerySchema = z.object({
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  claimType: z.union([claimTypeSchema, z.literal("")]).optional()
});

export const reimbursementActionSchema = z.object({
  taskId: z.string().trim().min(1),
  comment: z.string().trim().nullable().optional()
});

export const reimbursementTransferSchema = reimbursementActionSchema.extend({
  targetUserId: z.string().trim().min(1)
});

export const attachReimbursementUploadSchema = z.object({
  uploadId: z.string().trim().min(1),
  category: attachmentCategorySchema
});
