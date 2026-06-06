import type { NodeRuntimeConfig } from "@yinuo-ngm/core";
import type { Project } from "@yinuo-ngm/project";
import { z } from "zod";
import type { McpToolDefinition } from "./index";
import { projectLocatorSchema, resolveProject } from "./project.tools";
import { ok } from "../utils/result";

function normalizePackageManager(value: Project["packageManager"]): "npm" | "pnpm" | "yarn" {
  return value === "pnpm" || value === "yarn" ? value : "npm";
}

function runtimeConfigForProject(project: Project): NodeRuntimeConfig {
  if (project.runtime) {
    return {
      ...project.runtime,
      packageManager: normalizePackageManager(project.runtime.packageManager ?? project.packageManager),
    } as NodeRuntimeConfig;
  }

  if (project.nodeVersion) {
    return {
      type: "managed",
      version: project.nodeVersion,
      packageManager: normalizePackageManager(project.packageManager),
    };
  }

  return {
    type: "system",
    packageManager: normalizePackageManager(project.packageManager),
  };
}

export function runtimeTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.runtime.current",
      description: "Read current Node version manager information known to ng-manager.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      async handler(_args, context) {
        const current = await context.services.core.nodeVersion.getCurrentVersion();
        return ok("ngm.runtime.current", current);
      },
    },
    {
      name: "ngm.runtime.list",
      description: "List Node runtimes known to ng-manager.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      async handler(_args, context) {
        const runtimes = await context.services.core.nodeRuntime.listRuntimes();
        return ok("ngm.runtime.list", runtimes);
      },
    },
    {
      name: "ngm.runtime.resolveForProject",
      description: "Resolve the Node runtime ng-manager would use for a project.",
      riskLevel: "read",
      inputSchema: projectLocatorSchema,
      async handler(args, context) {
        const project = await resolveProject(context, args);
        const requestedRuntime = runtimeConfigForProject(project);
        const resolvedRuntime = await context.services.core.nodeRuntime.resolveRuntime(requestedRuntime);
        return ok("ngm.runtime.resolveForProject", {
          project: {
            id: project.id,
            name: project.name,
            root: project.root,
            packageManager: project.packageManager,
            nodeVersion: project.nodeVersion,
            runtime: project.runtime,
          },
          requestedRuntime,
          resolvedRuntime,
        });
      },
    },
    {
      name: "ngm.runtime.detectRequirement",
      description: "Detect Node version requirements for a project path or registered ng-manager project.",
      riskLevel: "read",
      inputSchema: projectLocatorSchema,
      async handler(args, context) {
        let projectPath = args.projectPath;
        let project: Pick<Project, "id" | "name" | "root"> | undefined;

        if (args.projectId) {
          const resolvedProject = await resolveProject(context, { projectId: args.projectId });
          projectPath = resolvedProject.root;
          project = {
            id: resolvedProject.id,
            name: resolvedProject.name,
            root: resolvedProject.root,
          };
        }

        if (!projectPath) {
          throw new Error("projectId or projectPath is required");
        }

        const requirement = await context.services.core.nodeVersion.detectProjectRequirement(projectPath);
        return ok("ngm.runtime.detectRequirement", {
          project,
          requirement,
        });
      },
    },
  ];
}
