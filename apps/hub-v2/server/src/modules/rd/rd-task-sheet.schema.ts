import { z } from "zod";

const taskSheetStatusSchema = z.enum(["draft", "issued", "processing", "replied", "closed"]);
const taskSheetUrgencySchema = z.enum(["normal", "urgent"]);
const taskSheetBusinessTypeSchema = z.enum(["development", "after_sales", "consulting", "technical_service", "other"]);
const taskSheetResultSchema = z.enum(["resolved", "unresolved"]);
const taskSheetDefaultRouteStatusSchema = z.enum(["active", "inactive"]);

function csvEnumArray<T extends [string, ...string[]]>(values: T) {
  const itemSchema = z.enum(values);
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return [];
    }
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(itemSchema).optional());
}

const nullableText = z.string().trim().nullable().optional();
const optionalText = z.string().trim().optional();

export const attachRdTaskSheetUploadSchema = z.object({
  uploadId: z.string().trim().min(1)
});

export const createRdTaskSheetSchema = z.object({
  projectId: z.string().trim().nullable().optional(),
  sheetNo: nullableText,
  title: z.string().trim().min(1),
  issueDate: z.string().trim().optional(),
  issuerDepartment: nullableText,
  issuerUserId: nullableText,
  issuerName: nullableText,
  receiverDepartment: nullableText,
  receiverUserId: nullableText,
  receiverName: nullableText,
  receiverPhone: nullableText,
  processorUserId: nullableText,
  customerCompany: nullableText,
  customerContact: nullableText,
  customerPhone: nullableText,
  projectName: nullableText,
  projectContact: nullableText,
  relatedSystem: nullableText,
  urgency: taskSheetUrgencySchema.optional(),
  businessType: taskSheetBusinessTypeSchema.optional(),
  expectedResolvedAt: nullableText,
  resolvedAt: nullableText,
  result: taskSheetResultSchema.nullable().optional(),
  businessDescription: z.string().trim().min(1),
  deliveryContent: nullableText,
  attachments: z.array(attachRdTaskSheetUploadSchema).optional()
});

export const updateRdTaskSheetSchema = z.object({
  projectId: z.string().trim().nullable().optional(),
  sheetNo: nullableText,
  title: optionalText,
  issueDate: optionalText,
  issuerDepartment: nullableText,
  issuerUserId: nullableText,
  issuerName: nullableText,
  receiverDepartment: nullableText,
  receiverUserId: nullableText,
  receiverName: nullableText,
  receiverPhone: nullableText,
  processorUserId: nullableText,
  customerCompany: nullableText,
  customerContact: nullableText,
  customerPhone: nullableText,
  projectName: nullableText,
  projectContact: nullableText,
  relatedSystem: nullableText,
  urgency: taskSheetUrgencySchema.optional(),
  businessType: taskSheetBusinessTypeSchema.optional(),
  expectedResolvedAt: nullableText,
  businessDescription: optionalText
});

export const replyRdTaskSheetSchema = z.object({
  result: taskSheetResultSchema,
  resolvedAt: nullableText,
  deliveryContent: z.string().trim().min(1)
});

export const closeRdTaskSheetSchema = z.object({
  reason: nullableText
});

export const previewRdTaskSheetImportSchema = z.object({
  uploadId: z.string().trim().min(1)
});

export const convertRdTaskSheetToRdItemSchema = z.object({
  projectId: nullableText,
  title: optionalText,
  description: optionalText,
  type: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  memberIds: z.array(z.string().trim().min(1)).optional(),
  verifierId: nullableText,
  planStartAt: nullableText,
  planEndAt: nullableText
});

export const convertRdTaskSheetToIssueSchema = z.object({
  projectId: nullableText,
  title: optionalText,
  description: optionalText,
  type: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  assigneeId: nullableText,
  verifierId: nullableText,
  rdItemId: nullableText
});

export const listRdTaskSheetsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  scope: z.enum(["related", "all"]).optional(),
  projectId: z.string().trim().optional(),
  unlinked: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    return value === true || String(value).toLowerCase() === "true" || String(value) === "1";
  }, z.boolean().optional()),
  status: csvEnumArray(["draft", "issued", "processing", "replied", "closed"]),
  issuerUserId: z.string().trim().optional(),
  receiverUserId: z.string().trim().optional(),
  processorUserId: z.string().trim().optional(),
  keyword: z.string().trim().optional()
});

export const listRdTaskSheetDefaultRoutesQuerySchema = z.object({
  keyword: z.string().trim().optional(),
  status: z.union([taskSheetDefaultRouteStatusSchema, z.literal("")]).optional()
});

export const matchRdTaskSheetDefaultRouteQuerySchema = z.object({
  issuerUserId: z.string().trim().min(1).optional()
});

export const createRdTaskSheetDefaultRouteSchema = z.object({
  issuerUserId: nullableText,
  issuerName: nullableText,
  issuerDepartment: nullableText,
  receiverUserId: nullableText,
  receiverName: nullableText,
  receiverDepartment: nullableText,
  receiverPhone: nullableText,
  status: taskSheetDefaultRouteStatusSchema.optional(),
  remark: nullableText,
  sort: z.coerce.number().int().optional()
});

export const updateRdTaskSheetDefaultRouteSchema = createRdTaskSheetDefaultRouteSchema.partial();
