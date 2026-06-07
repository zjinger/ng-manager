import type { McpToolDefinition } from "../index";
import { blocked, controlledFields, isConfirmed, operation } from "../controlled/operation-result";
import { ok } from "../../utils/result";
import { requireLocalServer } from "../controlled/local-server";
import { requiredEnv, requireWritePolicy } from "../controlled/operation-policy";
import { setRuntimeSchema } from "../controlled/schemas";
import { runtimeConfigForProject, toRuntimeConfig, validateTargetRuntime } from "../project/runtime-config";
import { ProjectResolverService } from "../../services/project-resolver.service";
import { McpErrorCodes } from "../../errors/error-codes";

function projectResolver(context: Parameters<McpToolDefinition["handler"]>[1]): ProjectResolverService {
  return (context.services as any).projectResolver ?? new ProjectResolverService(context.services.core.project as any);
}

export function runtimeControlTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm_runtime_set_for_project",
      description: "Skill ngm-runtime. Controlled write tool for binding a registered ng-manager projectId to a Node runtime config through the local ng-manager server. Prefer this over editing config files or shell profiles because it preserves server/UI state and audit. Previews by default; real write requires confirm=true and NGM_MCP_ALLOW_WRITE=true. It does not modify system PATH, nvm, shell profiles, or install runtimes.",
      riskLevel: "write",
      allowPreviewWhenBlocked: true,
      deferPolicyToHandler: true,
      isConfirmed,
      inputSchema: setRuntimeSchema,
      async handler(args, context) {
        const confirmed = isConfirmed(args);
        if (confirmed) {
          const policyBlock = requireWritePolicy("medium", `Set Node runtime binding for registered project "${args.projectId}".`);
          if (policyBlock) return ok("ngm_runtime_set_for_project", { ...controlledFields("write", true, requiredEnv("write")), ...policyBlock });
        }
        const project = await projectResolver(context).resolveProject(args.projectId);
        const nextRuntime = toRuntimeConfig(args.runtime);
        validateTargetRuntime(nextRuntime);
        const safetyMessage = `Set Node runtime binding for managed project "${project.name}".`;
        const oldRuntime = runtimeConfigForProject(project as any);

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
          ...controlledFields("write", confirmed, requiredEnv("write")),
          operation: operation("preview", "write", "medium", safetyMessage),
          project: { id: project.id, name: project.name, root: project.root },
          diff: { oldRuntime, newRuntime: nextRuntime },
          resolvedRuntime,
        };
        if (!confirmed) return ok("ngm_runtime_set_for_project", preview);

        const serverCheck = await requireLocalServer(context);
        if (!serverCheck.server) {
          return ok("ngm_runtime_set_for_project", blocked("write", "medium", safetyMessage, "ng-manager local server is unavailable; start ngm server or ngm ui before writing project runtime config", {
            ...controlledFields("write", true, requiredEnv("write")),
            localServer: serverCheck.availability,
            project: { id: project.id, name: project.name, root: project.root },
            oldRuntime,
            newRuntime: nextRuntime,
          }, McpErrorCodes.LOCAL_SERVER_UNAVAILABLE));
        }

        const updatedProject = await serverCheck.server.updateProjectRuntime(project.id, nextRuntime);
        const verifiedRuntime = await context.services.core.nodeRuntime.resolveRuntime(nextRuntime);
        return ok("ngm_runtime_set_for_project", {
          ...preview,
          ...controlledFields("write", true, requiredEnv("write")),
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
