import * as path from "path";
import { z } from "zod";
import { ok } from "../utils/result";
import type { McpToolDefinition } from "./index";
import { capabilityCatalog, toolCatalog } from "./tool-catalog";
import { listKnownWorkspacePackages, readPackageJsonSummary } from "./workspace-package";

const getPackageSchema = z.object({
  name: z.string().trim().min(1).optional(),
  path: z.string().trim().min(1).optional(),
}).strict();

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "").toLowerCase();
}

function capabilityMap() {
  return [
    {
      area: "packages/mcp-server",
      capability: "Agent-facing MCP adapter and tool exposure",
      skill: "ngm-workspace",
      notes: "Keep tools as thin adapters over core services where possible.",
    },
    {
      area: "packages/project",
      capability: "Local project records and workspace detection",
      skill: "ngm-project",
    },
    {
      area: "packages/task",
      capability: "Package script task views, runtime state, and log streaming",
      skill: "ngm-project",
    },
    {
      area: "packages/node-runtime, packages/node-version",
      capability: "Node runtime resolution and project Node requirement detection",
      skill: "ngm-runtime",
    },
    {
      area: "packages/nginx",
      capability: "Local Nginx binding, server blocks, upstreams, validation, and logs",
      skill: "ngm-nginx",
    },
    {
      area: "packages/api, webapp/src/app/pages/api-client",
      capability: "Local API debugging data and UI",
      skill: "ngm-workspace",
    },
    {
      area: "packages/design-handoff",
      capability: "Design handoff package validation and task generation",
      skill: "ngm-workspace",
    },
    {
      area: "webapp",
      capability: "Single frontend used by CLI and desktop launch modes",
      skill: "ngm-workspace",
    },
    {
      area: "packages/server",
      capability: "Single local backend authority for runtime state and APIs",
      skill: "ngm-workspace",
    },
    {
      area: "packages/cli, desktop",
      capability: "Thin local entry points for the same backend/frontend product",
      skill: "ngm-workspace",
    },
    {
      area: "apps/hub-v2",
      capability: "Hub V2 collaboration platform server/web business logic",
      skill: "hub-v2-api",
    },
  ];
}

export function workspaceTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.workspace.summary",
      description: "Summarize the local ng-manager workspace root, major app/package areas, and MCP read-only discovery status.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      async handler(_args, context) {
        const packages = await listKnownWorkspacePackages(context.workspaceRoot);
        return ok("ngm.workspace.summary", {
          workspaceRoot: context.workspaceRoot,
          dataDir: context.dataDir,
          packageCount: packages.length,
          packageNames: packages.map((item) => item.name).filter(Boolean),
          majorAreas: capabilityMap(),
          readOnlyPhase: true,
          codeGraph: {
            exposedByThisMcpServer: false,
            guidance: "Use external CodeGraph MCP tools when available; this server exposes workspace and package metadata only.",
          },
        });
      },
    },
    {
      name: "ngm.workspace.listPackages",
      description: "List package.json metadata from known ng-manager workspace package and app roots.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      async handler(_args, context) {
        const packages = await listKnownWorkspacePackages(context.workspaceRoot);
        return ok("ngm.workspace.listPackages", packages);
      },
    },
    {
      name: "ngm.workspace.getPackage",
      description: "Get package.json metadata for one known ng-manager workspace package or app by name or relative path.",
      riskLevel: "read",
      inputSchema: getPackageSchema,
      async handler(args, context) {
        if (!args.name && !args.path) {
          throw new Error("name or path is required");
        }

        const packages = await listKnownWorkspacePackages(context.workspaceRoot);
        const requestedPath = args.path ? normalizePath(args.path) : "";
        const found = packages.find((item) => {
          if (args.name && item.name === args.name) return true;
          if (!requestedPath) return false;
          return normalizePath(item.path) === requestedPath || normalizePath(item.packageJsonPath) === requestedPath;
        });

        if (!found) {
          throw new Error(`Workspace package not found: ${args.name || args.path}`);
        }

        return ok("ngm.workspace.getPackage", found);
      },
    },
    {
      name: "ngm.workspace.mcpTools",
      description: "List ng-manager MCP tools with skill, capability, and risk-level mapping.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      handler() {
        return ok("ngm.workspace.mcpTools", toolCatalog);
      },
    },
    {
      name: "ngm.workspace.capabilityMap",
      description: "Map ng-manager workspace areas and MCP capability groups to the correct NGM or Hub V2 skill.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      handler() {
        return ok("ngm.workspace.capabilityMap", {
          areas: capabilityMap(),
          capabilities: capabilityCatalog,
        });
      },
    },
  ];
}

export async function readWorkspacePackageJson(workspaceRoot: string, packageDir: string) {
  return readPackageJsonSummary(workspaceRoot, path.resolve(packageDir));
}
