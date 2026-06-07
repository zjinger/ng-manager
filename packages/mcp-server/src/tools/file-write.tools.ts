import { z } from "zod";
import type { McpToolDefinition } from "./index";
import { controlledFields, isConfirmed, operation } from "./controlled/operation-result";
import { requiredEnv, requireWritePolicy } from "./controlled/operation-policy";
import { projectRelativePath, writeTextFile } from "../filesystem/project-files";
import { ok, fail } from "../utils/result";
import { PathGuardService } from "../services/path-guard.service";
import { ProjectResolverService } from "../services/project-resolver.service";
import { errorMessage, errorMetadata } from "../utils/errors";
import { MCP_TOOL_NAMES } from "../registry/tool-names";

const fileWriteSchema = z.object({
  projectId: z.string().trim().min(1),
  relativePath: z.string().trim().min(1),
  content: z.string(),
  confirm: z.boolean().optional(),
  dryRun: z.boolean().optional(),
}).strict();

function pathGuard(context: Parameters<McpToolDefinition["handler"]>[1]): PathGuardService {
  return (context.services as any).pathGuard ?? new PathGuardService();
}

function projectResolver(context: Parameters<McpToolDefinition["handler"]>[1]): ProjectResolverService {
  return (context.services as any).projectResolver ?? new ProjectResolverService(context.services.core.project as any);
}

export function fileWriteTools(): McpToolDefinition[] {
  return [
    {
      name: MCP_TOOL_NAMES.NGM_FILE_WRITE,
      description: "Controlled write for text files inside a registered ng-manager project. Use this instead of direct filesystem writes when the target is an ng-manager project: it accepts projectId plus project-relative relativePath only, rejects absolute paths and traversal, previews by default, and confirmed writes require NGM_MCP_ALLOW_WRITE=true and are audit logged.",
      riskLevel: "write",
      allowPreviewWhenBlocked: true,
      deferPolicyToHandler: true,
      isConfirmed,
      inputSchema: fileWriteSchema,
      async handler(args, context) {
        const confirmed = isConfirmed(args);
        const project = await projectResolver(context).resolveProject(args.projectId);
        const safetyMessage = `Write project file "${args.relativePath}" for managed project "${project.name}".`;
        let target: string;
        try {
          target = pathGuard(context).resolveInsideProject(project.root, args.relativePath);
        } catch (error) {
          return fail(MCP_TOOL_NAMES.NGM_FILE_WRITE, errorMessage(error), errorMetadata(error));
        }
        const relativePath = projectRelativePath(project.root, target);
        const preview = {
          ...controlledFields("write", confirmed, requiredEnv("write")),
          operation: operation("preview", "write", "medium", safetyMessage),
          project: { id: project.id, name: project.name, path: project.root },
          relativePath,
          bytes: Buffer.byteLength(args.content, "utf-8"),
        };

        if (!confirmed) return ok(MCP_TOOL_NAMES.NGM_FILE_WRITE, preview);
        const policyBlock = requireWritePolicy("medium", safetyMessage);
        if (policyBlock) return ok(MCP_TOOL_NAMES.NGM_FILE_WRITE, policyBlock);

        await writeTextFile(target, args.content);
        return ok(MCP_TOOL_NAMES.NGM_FILE_WRITE, {
          ...preview,
          ...controlledFields("write", true, requiredEnv("write")),
          operation: operation("executed", "write", "medium", safetyMessage),
          changedFiles: [relativePath],
        });
      },
    },
  ];
}
