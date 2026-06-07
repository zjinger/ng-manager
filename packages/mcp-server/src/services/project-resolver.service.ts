import { existsSync } from "fs";
import * as path from "path";
import { McpErrorCodes } from "../errors/error-codes";
import { McpToolError } from "../errors/mcp-tool-error";

export interface ResolvedProject {
  id: string;
  name: string;
  root: string;
  type?: string;
  createdAt?: number;
  updatedAt?: number;
  framework?: string;
  scripts?: Record<string, string>;
  packageManager?: string;
  runtime?: any;
  nodeVersion?: string;
  isFavorite?: boolean;
  repoUrl?: string;
  repoPageUrl?: string;
  env?: unknown;
  assets?: unknown;
  lastOpened?: unknown;
}

type ProjectRegistry = {
  list?: () => Promise<any[]>;
  get?: (projectId: string) => Promise<any>;
};

export class ProjectResolverService {
  constructor(private readonly projectRegistry: ProjectRegistry) {}

  async listProjects(): Promise<ResolvedProject[]> {
    if (typeof this.projectRegistry.list !== "function") {
      return [];
    }
    const projects = await this.projectRegistry.list();
    return projects.map((project) => this.normalizeProject(project));
  }

  async resolveProject(projectId: string): Promise<ResolvedProject> {
    const id = projectId.trim();
    if (!id) {
      throw new McpToolError(McpErrorCodes.TOOL_INPUT_INVALID, "projectId is required");
    }

    const listed = await this.listProjects();
    const fromList = listed.find((project) => project.id === id);
    const project = fromList ?? await this.getProject(id);
    if (!project) {
      throw new McpToolError(McpErrorCodes.PROJECT_NOT_FOUND, `Project not found: ${id}`, { projectId: id });
    }

    const normalized = this.normalizeProject(project);
    if (!existsSync(normalized.root)) {
      throw new McpToolError(McpErrorCodes.PROJECT_ROOT_NOT_FOUND, "registered project root does not exist", {
        project: { id: normalized.id, name: normalized.name, root: normalized.root },
      });
    }
    return normalized;
  }

  private async getProject(projectId: string): Promise<ResolvedProject | null> {
    if (typeof this.projectRegistry.get !== "function") {
      return null;
    }
    try {
      return await this.projectRegistry.get(projectId);
    } catch (error) {
      throw new McpToolError(McpErrorCodes.PROJECT_NOT_FOUND, `Project not found: ${projectId}`, {
        projectId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private normalizeProject(project: ResolvedProject): ResolvedProject {
    return {
      ...project,
      id: String(project.id),
      name: String(project.name),
      root: path.resolve(String(project.root)),
      type: project.type ?? (typeof project.framework === "string" ? project.framework : undefined),
    };
  }
}
