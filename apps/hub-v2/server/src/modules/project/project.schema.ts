import { z } from "zod";

const projectTypeSchema = z.enum(["entrust_dev", "self_dev", "tech_service"]);
const projectDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be yyyy-MM-dd");
const featurePointStatusSchema = z.enum(["todo", "in_progress", "done", "paused"]);
const featureProgressTargetTypeSchema = z.enum(["project", "module"]);

export const createProjectSchema = z.object({
  name: z.string().trim().min(1),
  projectNo: z.string().trim().min(1).max(64),
  projectType: projectTypeSchema,
  displayCode: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,3}$/, "displayCode must be uppercase A-Z/0-9 and max 3")
    .optional(),
  description: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  avatarUploadId: z.string().trim().optional(),
  contractNo: z.string().trim().optional(),
  deliveryDate: projectDateSchema.optional(),
  productLine: z.string().trim().optional(),
  slaLevel: z.string().trim().optional(),
  visibility: z.enum(["internal", "private"]).optional()
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
  projectNo: z.string().trim().min(1).max(64).optional(),
  projectType: projectTypeSchema.optional(),
  displayCode: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,3}$/, "displayCode must be uppercase A-Z/0-9 and max 3")
    .nullable()
    .optional(),
  description: z.string().trim().nullable().optional(),
  icon: z.string().trim().nullable().optional(),
  avatarUploadId: z.string().trim().nullable().optional(),
  contractNo: z.string().trim().nullable().optional(),
  deliveryDate: projectDateSchema.nullable().optional(),
  productLine: z.string().trim().nullable().optional(),
  slaLevel: z.string().trim().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  visibility: z.enum(["internal", "private"]).optional()
});

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  scope: z.enum(["all_accessible", "member_only"]).optional()
});

export const addProjectMemberSchema = z.object({
  userId: z.string().trim().min(1),
  roleCode: z.enum(["member", "product", "ui", "frontend_dev", "backend_dev", "qa", "ops", "project_admin"]).optional(),
  isOwner: z.boolean().optional()
});

export const updateProjectMemberSchema = z.object({
  roleCode: z.enum(["member", "product", "ui", "frontend_dev", "backend_dev", "qa", "ops", "project_admin"]).optional(),
  isOwner: z.boolean().optional()
});

export const createProjectConfigItemSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().optional(),
  projectNo: z.string().trim().max(64).optional(),
  parentId: z.string().trim().nullable().optional(),
  nodeType: z.enum(["subsystem", "module"]).optional(),
  ownerUserId: z.string().trim().nullable().optional(),
  iconCode: z.string().trim().max(64).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  status: z.enum(["todo", "in_progress", "released", "paused"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  enabled: z.boolean().optional(),
  sort: z.number().int().min(0).optional(),
  description: z.string().trim().optional()
});

export const updateProjectConfigItemSchema = z.object({
  name: z.string().trim().min(1).optional(),
  code: z.string().trim().nullable().optional(),
  projectNo: z.string().trim().max(64).nullable().optional(),
  parentId: z.string().trim().nullable().optional(),
  nodeType: z.enum(["subsystem", "module"]).optional(),
  ownerUserId: z.string().trim().nullable().optional(),
  iconCode: z.string().trim().max(64).nullable().optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  status: z.enum(["todo", "in_progress", "released", "paused"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  enabled: z.boolean().optional(),
  sort: z.number().int().min(0).optional(),
  description: z.string().trim().nullable().optional()
});

export const updateProjectFeatureProgressSettingsSchema = z.object({
  enabled: z.boolean()
});

export const createProjectFeaturePointSchema = z.object({
  name: z.string().trim().min(1),
  moduleId: z.string().trim().nullable().optional(),
  moduleGroupId: z.string().trim().nullable().optional(),
  submoduleGroupId: z.string().trim().nullable().optional(),
  moduleName: z.string().trim().nullable().optional(),
  submoduleName: z.string().trim().nullable().optional(),
  ownerUserId: z.string().trim().nullable().optional(),
  ownerUserIds: z.array(z.string().trim().min(1)).optional(),
  status: featurePointStatusSchema.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  enabled: z.boolean().optional(),
  sort: z.number().int().min(0).optional(),
  remark: z.string().trim().nullable().optional()
});

export const updateProjectFeaturePointSchema = z.object({
  name: z.string().trim().min(1).optional(),
  moduleId: z.string().trim().nullable().optional(),
  moduleGroupId: z.string().trim().nullable().optional(),
  submoduleGroupId: z.string().trim().nullable().optional(),
  moduleName: z.string().trim().nullable().optional(),
  submoduleName: z.string().trim().nullable().optional(),
  ownerUserId: z.string().trim().nullable().optional(),
  ownerUserIds: z.array(z.string().trim().min(1)).optional(),
  status: featurePointStatusSchema.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  enabled: z.boolean().optional(),
  sort: z.number().int().min(0).optional(),
  remark: z.string().trim().nullable().optional()
});

export const createProjectFeaturePointGroupSchema = z.object({
  name: z.string().trim().min(1),
  parentId: z.string().trim().nullable().optional(),
  manualProgress: z.number().int().min(0).max(100).nullable().optional(),
  sort: z.number().int().min(0).optional(),
  remark: z.string().trim().nullable().optional()
});

export const updateProjectFeaturePointGroupSchema = z.object({
  name: z.string().trim().min(1).optional(),
  parentId: z.string().trim().nullable().optional(),
  manualProgress: z.number().int().min(0).max(100).nullable().optional(),
  sort: z.number().int().min(0).optional(),
  remark: z.string().trim().nullable().optional()
});

export const upsertProjectFeatureProgressOverrideSchema = z.object({
  targetType: featureProgressTargetTypeSchema,
  targetId: z.string().trim().min(1),
  progress: z.number().int().min(0).max(100),
  remark: z.string().trim().nullable().optional()
});

export const deleteProjectFeatureProgressOverrideQuerySchema = z.object({
  targetType: featureProgressTargetTypeSchema,
  targetId: z.string().trim().min(1)
});

export const addProjectModuleMemberSchema = z.object({
  userId: z.string().trim().min(1),
  roleCode: z.enum(["member", "product", "ui", "frontend_dev", "backend_dev", "qa", "ops", "project_admin"]).optional()
});

export const replaceModuleRdLinksSchema = z.object({
  rdItemIds: z.array(z.string().trim().min(1)).default([])
});

export const createProjectVersionItemSchema = z.object({
  version: z.string().trim().min(1),
  code: z.string().trim().optional(),
  enabled: z.boolean().optional(),
  sort: z.number().int().min(0).optional(),
  description: z.string().trim().optional()
});

export const updateProjectVersionItemSchema = z.object({
  version: z.string().trim().min(1).optional(),
  code: z.string().trim().nullable().optional(),
  enabled: z.boolean().optional(),
  sort: z.number().int().min(0).optional(),
  description: z.string().trim().nullable().optional()
});
