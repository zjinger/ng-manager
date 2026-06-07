import { existsSync } from "fs";
import * as path from "path";
import { z } from "zod";
import type { McpToolDefinition } from "./index";
import { blocked, isConfirmed, operation } from "./controlled/operation-result";
import { requireWritePolicy } from "./controlled/operation-policy";
import { assertPathInsideProject, projectRelativePath, writeTextFile } from "../filesystem/project-files";
import { ok } from "../utils/result";

const fileWriteSchema = z.object({
  projectId: z.string().trim().min(1),
  relativePath: z.string().trim().min(1),
  content: z.string(),
  confirm: z.boolean().optional(),
  dryRun: z.boolean().optional(),
}).strict();

function resolveProjectRelativeFile(projectRoot: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (path.isAbsolute(normalized)) {
    throw new Error("relativePath must not be absolute");
  }
  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length || parts.includes("..")) {
    throw new Error("relativePath must stay inside the project directory");
  }
  const target = path.resolve(projectRoot, ...parts);
  assertPathInsideProject(projectRoot, target);
  return target;
}

export function fileWriteTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm_file_write",
      description: "Preview or write a text file inside a registered ng-manager project using projectId and a project-relative path.",
      riskLevel: "write",
      allowPreviewWhenBlocked: true,
      deferPolicyToHandler: true,
      isConfirmed,
      inputSchema: fileWriteSchema,
      async handler(args, context) {
        const project = await context.services.core.project.get(args.projectId);
        const safetyMessage = `Write project file "${args.relativePath}" for managed project "${project.name}".`;
        if (!existsSync(project.root)) {
          return ok("ngm_file_write", blocked("write", "medium", safetyMessage, "registered project path does not exist", {
            project: { id: project.id, name: project.name, path: project.root },
          }));
        }
        const target = resolveProjectRelativeFile(project.root, args.relativePath);
        const relativePath = projectRelativePath(project.root, target);
        const preview = {
          operation: operation("preview", "write", "medium", safetyMessage),
          project: { id: project.id, name: project.name, path: project.root },
          relativePath,
          bytes: Buffer.byteLength(args.content, "utf-8"),
        };

        if (!isConfirmed(args)) return ok("ngm_file_write", preview);
        const policyBlock = requireWritePolicy("medium", safetyMessage);
        if (policyBlock) return ok("ngm_file_write", policyBlock);

        await writeTextFile(target, args.content);
        return ok("ngm_file_write", {
          ...preview,
          operation: operation("executed", "write", "medium", safetyMessage),
          changedFiles: [relativePath],
        });
      },
    },
  ];
}
