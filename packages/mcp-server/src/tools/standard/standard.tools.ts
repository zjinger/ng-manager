import { z } from "zod";
import type { McpToolDefinition } from "../index";
import { ok } from "../../utils/result";
import { resolveProjectRoot, projectRelativePath } from "../../filesystem/project-files";
import { blocked, isConfirmed, operation } from "../controlled/operation-result";
import { requireWritePolicy } from "../controlled/operation-policy";
import { initFrontendStandard, loadFrontendStandard, validateFrontendProject } from "../../standard/frontend-standard.service";

const projectSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectPath: z.string().trim().min(1).optional(),
}).strict();

const initSchema = projectSchema.extend({
  overwrite: z.boolean().optional(),
  confirm: z.boolean().optional(),
  dryRun: z.boolean().optional(),
}).strict();

export function standardTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.standard.get",
      description: "Read the frontend standard config for a project, returning defaults when .ng-manager/frontend-standard.json does not exist.",
      riskLevel: "read",
      inputSchema: projectSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        return ok("ngm.standard.get", {
          project,
          source: loaded.source,
          path: projectRelativePath(project.projectRoot, loaded.path),
          standard: loaded.standard,
        });
      },
    },
    {
      name: "ngm.standard.init",
      description: "Preview or create .ng-manager/frontend-standard.json for a project. Requires confirm=true and NGM_MCP_ALLOW_WRITE=true to write.",
      riskLevel: "write",
      allowPreviewWhenBlocked: true,
      deferPolicyToHandler: true,
      isConfirmed,
      inputSchema: initSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        const safetyMessage = "Create or replace project frontend standard configuration.";
        const preview = {
          operation: operation("preview", "write", "low", safetyMessage),
          project,
          path: projectRelativePath(project.projectRoot, loaded.path),
          standard: loaded.standard,
        };
        if (!isConfirmed(args)) return ok("ngm.standard.init", preview);
        const policyBlock = requireWritePolicy("low", safetyMessage);
        if (policyBlock) return ok("ngm.standard.init", policyBlock);
        const result = await initFrontendStandard(project, args.overwrite === true);
        if (result.status === "blocked") {
          return ok("ngm.standard.init", blocked("write", "low", safetyMessage, result.reason ?? "frontend standard init was blocked", {
            path: projectRelativePath(project.projectRoot, result.path),
          }));
        }
        return ok("ngm.standard.init", {
          ...preview,
          operation: operation("executed", "write", "low", safetyMessage),
          path: projectRelativePath(project.projectRoot, result.path),
          changedFiles: result.changedFiles,
        });
      },
    },
    {
      name: "ngm.standard.validateProject",
      description: "Run lightweight frontend standard checks for Angular structure, component boundaries, and test naming.",
      riskLevel: "read",
      inputSchema: projectSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        const result = await validateFrontendProject(project, loaded.standard);
        return ok("ngm.standard.validateProject", {
          project,
          standardSource: loaded.source,
          ...result,
        });
      },
    },
  ];
}
