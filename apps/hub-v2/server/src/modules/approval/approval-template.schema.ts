import { z } from "zod";

const codeSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{2,48}$/, "code must be 2-48 chars, alphanumeric, hyphen or underscore");
const statusSchema = z.enum(["active", "inactive"]);
const stageTypeSchema = z.enum(["direct_manager", "department_manager", "finance_review", "cashier", "special_authorizer"]);
const resolverTypeSchema = z.enum(["direct_manager", "department_manager", "department_chain", "finance_approver", "system_role"]);

export const listApprovalTemplatesQuerySchema = z.object({
  keyword: z.string().trim().optional(),
  status: z.union([statusSchema, z.literal("")]).optional()
});

export const approvalTemplateStageSchema = z.object({
  stageCode: codeSchema,
  stageName: z.string().trim().min(1).max(80),
  stageType: stageTypeSchema,
  resolverType: resolverTypeSchema,
  resolverRef: z.string().trim().nullable().optional(),
  sort: z.coerce.number().int().min(0).optional()
});

export const createApprovalTemplateSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().nullable().optional(),
  status: statusSchema.optional(),
  stages: z.array(approvalTemplateStageSchema).optional()
});

export const updateApprovalTemplateSchema = createApprovalTemplateSchema.partial();
