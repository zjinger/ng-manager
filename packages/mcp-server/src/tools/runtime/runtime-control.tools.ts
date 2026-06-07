import type { McpToolDefinition } from "../index";
import { blocked, isConfirmed, operation } from "../controlled/operation-result";
import { ok } from "../../utils/result";
import { requireLocalServer } from "../controlled/local-server";
import { requireWritePolicy } from "../controlled/operation-policy";
import { resolveProject } from "../project.tools";
import { setRuntimeSchema } from "../controlled/schemas";
import { runtimeConfigForProject, toRuntimeConfig, validateTargetRuntime } from "../project/runtime-config";

export function runtimeControlTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm_runtime_set_for_project",
      description: "Skill ngm-runtime. Controlled write tool for binding a managed project to a Node runtime config. Supports dry-run/preview; real write requires confirm=true and NGM_MCP_ALLOW_WRITE=true. It does not modify system PATH, nvm, shell profiles, or install runtimes.",
      riskLevel: "write",
      allowPreviewWhenBlocked: true,
      isConfirmed,
      inputSchema: setRuntimeSchema,
      async handler(args, context) {
        const project = await resolveProject(context, args);
        const nextRuntime = toRuntimeConfig(args.runtime);
        validateTargetRuntime(nextRuntime);
        const safetyMessage = `Set Node runtime binding for managed project "${project.name}".`;
        const oldRuntime = runtimeConfigForProject(project);

        let resolvedRuntime: unknown;
        try {
          resolvedRuntime = await context.services.core.nodeRuntime.resolveRuntime(nextRuntime);
        } catch (error) {
          return ok("ngm_runtime_set_for_project", blocked("write", "medium", safetyMessage, "target runtime could not be resolved", {
            error: error instanceof Error ? error.message : String(error),
            nextStep: "Install or register the target Node runtime before binding the project.",
            project: { id: project.id, name: project.name, root: project.root },
            oldRuntime,
            newRuntime: nextRuntime,
          }));
        }

        const preview = {
          operation: operation("preview", "write", "medium", safetyMessage),
          project: { id: project.id, name: project.name, root: project.root },
          diff: { oldRuntime, newRuntime: nextRuntime },
          resolvedRuntime,
        };
        if (!isConfirmed(args)) return ok("ngm_runtime_set_for_project", preview);

        const policyBlock = requireWritePolicy("medium", safetyMessage);
        if (policyBlock) return ok("ngm_runtime_set_for_project", policyBlock);

        const serverCheck = await requireLocalServer(context);
        if (!serverCheck.server) {
          return ok("ngm_runtime_set_for_project", blocked("write", "medium", safetyMessage, "ng-manager local server is unavailable; start ngm server or ngm ui before writing project runtime config", {
            localServer: serverCheck.availability,
            project: { id: project.id, name: project.name, root: project.root },
            oldRuntime,
            newRuntime: nextRuntime,
          }));
        }

        const updatedProject = await serverCheck.server.updateProjectRuntime(project.id, nextRuntime);
        const verifiedRuntime = await context.services.core.nodeRuntime.resolveRuntime(nextRuntime);
        return ok("ngm_runtime_set_for_project", {
          ...preview,
          operation: operation("executed", "write", "medium", safetyMessage),
          controlPlane: "local-server",
          localServer: serverCheck.availability,
          project: {
            id: updatedProject.id,
            name: updatedProject.name,
            root: updatedProject.root,
            runtime: updatedProject.runtime,
            nodeVersion: updatedProject.nodeVersion,
          },
          verifiedRuntime,
        });
      },
    },
  ];
}
