import { z } from "zod";

export const personalTodoPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export const personalTodoStatusSchema = z.enum(["todo", "doing", "done"]);
export const personalTodoTagColorSchema = z.enum(["blue", "purple", "green", "red", "orange", "cyan", "gray"]);
export const personalTodoFolderColorSchema = personalTodoTagColorSchema;

const dueSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }, "invalid date")
  .nullable()
  .optional();

export const createPersonalTodoSchema = z.object({
  title: z.string().trim().min(1).max(100),
  desc: z.string().trim().max(500).optional(),
  priority: personalTodoPrioritySchema,
  status: personalTodoStatusSchema,
  due: dueSchema,
  folderId: z.string().trim().min(1).max(80).nullable().optional(),
  tagIds: z.array(z.string().trim().min(1).max(80)).max(20).optional().default([])
});

export const updatePersonalTodoSchema = createPersonalTodoSchema;

export const updatePersonalTodoStatusSchema = z.object({
  status: personalTodoStatusSchema
});

export const createPersonalTodoTagSchema = z.object({
  name: z.string().trim().min(1).max(24),
  color: personalTodoTagColorSchema
});

export const updatePersonalTodoTagSchema = z.object({
  name: z.string().trim().min(1).max(24).optional(),
  color: personalTodoTagColorSchema.optional()
});

export const createPersonalTodoFolderSchema = z.object({
  name: z.string().trim().min(1).max(24),
  color: personalTodoFolderColorSchema
});

export const updatePersonalTodoFolderSchema = z.object({
  name: z.string().trim().min(1).max(24).optional(),
  color: personalTodoFolderColorSchema.optional()
});

export const listPersonalTodoQuerySchema = z.object({
  scope: z.enum(["active", "recycle"]).optional().default("active"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
  status: z.union([personalTodoStatusSchema, z.literal("all")]).optional().default("all"),
  priority: z.union([personalTodoPrioritySchema, z.literal("all")]).optional().default("all"),
  tagId: z.string().trim().min(1).max(80).optional(),
  folderId: z.string().trim().min(1).max(80).optional(),
  keyword: z.string().trim().max(100).optional(),
  groupBy: z.enum(["none", "status", "priority", "folder", "due"]).optional().default("status")
});
