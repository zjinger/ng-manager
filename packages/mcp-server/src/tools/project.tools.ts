import * as path from "path";
import type { Project } from "@yinuo-ngm/project";
import { z } from "zod";
import type { ToolContext } from "../context/tool-context";
import { ok } from "../utils/result";
import type { McpToolDefinition } from "./index";

export const projectLocatorSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectPath: z.string().trim().min(1).optional(),
}).strict();

type ProjectLocator = z.infer<typeof projectLocatorSchema>;

export async function resolveProject(context: ToolContext, locator: ProjectLocator): Promise<Project> {
  if (locator.projectId) {
    return context.services.core.project.get(locator.projectId);
  }

  if (locator.projectPath) {
    const projects = await context.services.core.project.list();
    const requestedPath = normalizeFsPath(locator.projectPath);
    const project = projects.find((item) => normalizeFsPath(item.root) === requestedPath);
    if (project) {
      return project;
    }
    throw new Error(`Project not found for path: ${locator.projectPath}`);
  }

  throw new Error("projectId or projectPath is required");
}

function normalizeFsPath(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.replace(/\\/g, "/").toLowerCase() : resolved;
}

function toProjectSummary(project: Project): Record<string, unknown> {
  return {
    id: project.id,
    name: project.name,
    root: project.root,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    scripts: project.scripts,
    packageManager: project.packageManager,
    runtime: project.runtime,
    nodeVersion: project.nodeVersion,
    framework: project.framework,
    env: project.env,
    isFavorite: project.isFavorite,
    lastOpened: project.lastOpened,
    repoUrl: project.repoUrl,
    repoPageUrl: project.repoPageUrl,
    assets: project.assets,
  };
}

function toProjectScripts(project: Project): Record<string, unknown> {
  return {
    id: project.id,
    name: project.name,
    root: project.root,
    scripts: project.scripts ?? {},
    packageManager: project.packageManager,
    nodeVersion: project.nodeVersion,
    runtime: project.runtime,
  };
}

export function projectTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.project.list",
      description: "List projects managed by ng-manager.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      async handler(_args, context) {
        const projects = await context.services.core.project.list();
        return ok("ngm.project.list", projects.map(toProjectSummary));
      },
    },
    {
      name: "ngm.project.get",
      description: "Get one ng-manager project by projectId or projectPath.",
      riskLevel: "read",
      inputSchema: projectLocatorSchema,
      async handler(args, context) {
        const project = await resolveProject(context, args);
        return ok("ngm.project.get", toProjectSummary(project));
      },
    },
    {
      name: "ngm.project.getScripts",
      description: "Get package scripts and runtime hints for one ng-manager project.",
      riskLevel: "read",
      inputSchema: projectLocatorSchema,
      async handler(args, context) {
        const project = await resolveProject(context, args);
        return ok("ngm.project.getScripts", toProjectScripts(project));
      },
    },
  ];
}
