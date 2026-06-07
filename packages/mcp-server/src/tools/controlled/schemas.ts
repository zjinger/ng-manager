import { z } from "zod";
import { projectLocatorSchema } from "../project.tools";

export const confirmSchema = {
  confirm: z.boolean().optional(),
  dryRun: z.boolean().optional(),
};

export const runScriptSchema = projectLocatorSchema.extend({
  script: z.string().trim().min(1),
  waitMs: z.number().int().min(0).max(10000).optional(),
  ...confirmSchema,
}).strict();

export const stopProjectSchema = projectLocatorSchema.extend({
  taskId: z.string().trim().min(1).optional(),
  script: z.string().trim().min(1).optional(),
  ...confirmSchema,
}).strict();

export const runtimeConfigSchema = z.object({
  type: z.enum(["system", "managed", "custom"]),
  name: z.string().trim().min(1).optional(),
  version: z.string().trim().min(1).optional(),
  nodePath: z.string().trim().min(1).optional(),
  packageManager: z.enum(["npm", "pnpm", "yarn"]).optional(),
}).strict();

export const setRuntimeSchema = projectLocatorSchema.extend({
  runtime: runtimeConfigSchema,
  ...confirmSchema,
}).strict();

export const nginxReloadSchema = z.object({
  ...confirmSchema,
}).strict();

export const nginxProxySaveSchema = z.object({
  serverId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  listen: z.array(z.string().trim().min(1)).min(1).optional(),
  domains: z.array(z.string().trim().min(1)).min(1).optional(),
  target: z.string().trim().min(1),
  locationPath: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  reloadAfterSave: z.boolean().optional(),
  ...confirmSchema,
}).strict();

export type RuntimeConfigArgs = z.infer<typeof runtimeConfigSchema>;
export type SetRuntimeArgs = z.infer<typeof setRuntimeSchema>;
export type StopProjectArgs = z.infer<typeof stopProjectSchema>;
export type NginxProxySaveArgs = z.infer<typeof nginxProxySaveSchema>;
