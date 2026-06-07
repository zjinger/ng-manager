import * as path from "path";
import { z } from "zod";
import { ok } from "../utils/result";
import type { McpToolDefinition } from "./index";
import { resolveProjectRoot, assertPathInsideProject, projectRelativePath } from "../filesystem/project-files";
import { redactText } from "../audit/redact";
import { capabilityCatalog, toolCatalog } from "./tool-catalog";
import { listKnownWorkspacePackages, readPackageJsonSummary } from "./workspace-package";

const getPackageSchema = z.object({
  name: z.string().trim().min(1).optional(),
  path: z.string().trim().min(1).optional(),
}).strict();

const workspaceDiffSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectPath: z.string().trim().min(1).optional(),
  includePatch: z.boolean().optional(),
  maxBytes: z.number().int().min(1).max(200000).optional(),
}).strict();

const patchPreviewSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectPath: z.string().trim().min(1).optional(),
  patch: z.string().min(1),
}).strict();

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "").toLowerCase();
}

function isForbiddenWorkspacePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.?\//, "");
  const parts = normalized.split("/");
  return parts.some((part) => ["node_modules", "dist", "build", ".git", "coverage", ".cache", ".angular", ".idea"].includes(part))
    || parts.some((part) => part === ".env" || part.startsWith(".env."))
    || normalized.endsWith(".pem")
    || normalized.endsWith(".key")
    || normalized.endsWith(".p12")
    || normalized.endsWith(".pfx")
    || normalized.endsWith(".jks")
    || normalized.endsWith(".keystore");
}

function assertWorkspaceReadablePath(projectRoot: string, filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/^a\//, "").replace(/^b\//, "");
  if (!normalized || normalized === "/dev/null") return normalized;
  if (path.isAbsolute(normalized) || normalized.includes("..")) {
    throw new Error(`Patch path is not project-relative: ${filePath}`);
  }
  if (isForbiddenWorkspacePath(normalized)) {
    throw new Error(`Patch path is forbidden for workspace preview: ${filePath}`);
  }
  const resolved = path.resolve(projectRoot, normalized);
  assertPathInsideProject(projectRoot, resolved);
  return projectRelativePath(projectRoot, resolved);
}

function summarizeDiffText(diffText: string, projectRoot: string) {
  if (/^GIT binary patch$/m.test(diffText) || /^Binary files\b/m.test(diffText)) {
    throw new Error("Binary patch is not supported by workspace preview");
  }
  const changed = new Set<string>();
  let addedLines = 0;
  let removedLines = 0;
  for (const line of diffText.split(/\r?\n/)) {
    const diffMatch = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (diffMatch) {
      changed.add(assertWorkspaceReadablePath(projectRoot, diffMatch[2]));
      continue;
    }
    const fileMatch = /^(?:---|\+\+\+) (?:a|b)\/(.+)$/.exec(line);
    if (fileMatch) {
      changed.add(assertWorkspaceReadablePath(projectRoot, fileMatch[1]));
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) addedLines += 1;
    if (line.startsWith("-")) removedLines += 1;
  }
  const changedFiles = [...changed].filter((item) => item !== "/dev/null").sort();
  return {
    changedFiles,
    addedLines,
    removedLines,
    summary: changedFiles.length
      ? `${changedFiles.length} file(s), +${addedLines}/-${removedLines}`
      : `0 file(s), +${addedLines}/-${removedLines}`,
  };
}

export function truncateUtf8(text: string, maxBytes: number): { text: string; truncated: boolean } {
  if (Buffer.byteLength(text, "utf-8") <= maxBytes) {
    return { text, truncated: false };
  }
  let end = Math.min(text.length, maxBytes);
  while (end > 0 && Buffer.byteLength(text.slice(0, end), "utf-8") > maxBytes) {
    end -= 1;
  }
  while (end > 0) {
    const last = text.charCodeAt(end - 1);
    if (last < 0xd800 || last > 0xdbff) break;
    end -= 1;
  }
  return { text: text.slice(0, end), truncated: true };
}

function patchPreview(diffText: string, maxBytes: number) {
  const redacted = redactText(diffText);
  const truncated = truncateUtf8(redacted, maxBytes);
  return {
    patchPreview: truncated.text,
    truncated: truncated.truncated,
  };
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
      name: "ngm_workspace_summary",
      description: "Summarize the local ng-manager workspace root, major app/package areas, and MCP read-only discovery status.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      async handler(_args, context) {
        const packages = await listKnownWorkspacePackages(context.workspaceRoot);
        return ok("ngm_workspace_summary", {
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
      name: "ngm_workspace_list_packages",
      description: "List package.json metadata from known ng-manager workspace package and app roots.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      async handler(_args, context) {
        const packages = await listKnownWorkspacePackages(context.workspaceRoot);
        return ok("ngm_workspace_list_packages", packages);
      },
    },
    {
      name: "ngm_workspace_get_package",
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

        return ok("ngm_workspace_get_package", found);
      },
    },
    {
      name: "ngm_workspace_mcp_tools",
      description: "List ng-manager MCP tools with skill, capability, and risk-level mapping.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      handler() {
        return ok("ngm_workspace_mcp_tools", toolCatalog);
      },
    },
    {
      name: "ngm_workspace_capability_map",
      description: "Map ng-manager workspace areas and MCP capability groups to the correct NGM or Hub V2 skill.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      handler() {
        return ok("ngm_workspace_capability_map", {
          areas: capabilityMap(),
          capabilities: capabilityCatalog,
        });
      },
    },
    {
      name: "ngm_workspace_diff",
      description: "Read a safe Git diff summary for a project without exposing forbidden workspace paths.",
      riskLevel: "read",
      inputSchema: workspaceDiffSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const maxBytes = args.maxBytes ?? 20000;
        const gitArgs = { ...args, projectPath: project.projectRoot };
        const diff = await context.services.git.diff(gitArgs);
        const diffText = typeof (diff as { diff?: unknown }).diff === "string" ? (diff as { diff: string }).diff : JSON.stringify(diff);
        const summary = summarizeDiffText(diffText, project.projectRoot);
        const includePatch = args.includePatch === true;
        const preview = includePatch ? patchPreview(diffText, maxBytes) : undefined;
        return ok("ngm_workspace_diff", {
          project,
          ...summary,
          ...(preview ? {
            ...preview,
            maxBytes,
            truncated: Boolean((diff as { truncated?: unknown }).truncated) || preview.truncated,
          } : {}),
        });
      },
    },
    {
      name: "ngm_workspace_apply_patch_preview",
      description: "Preview a unified patch without writing files. It rejects forbidden paths and returns changed files plus added/removed line counts.",
      riskLevel: "read",
      inputSchema: patchPreviewSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const summary = summarizeDiffText(args.patch, project.projectRoot);
        return ok("ngm_workspace_apply_patch_preview", {
          project,
          operation: {
            status: "preview",
            type: "write",
            risk: "medium",
            safetyMessage: "Patch preview only; no file writes are performed.",
          },
          ...summary,
        });
      },
    },
  ];
}

export async function readWorkspacePackageJson(workspaceRoot: string, packageDir: string) {
  return readPackageJsonSummary(workspaceRoot, path.resolve(packageDir));
}
