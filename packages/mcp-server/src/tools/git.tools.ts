import { z } from "zod";
import type { McpToolDefinition } from "./index";
import { ok } from "../utils/result";
import type { ToolContext } from "../context/tool-context";
import { resolveProjectRoot } from "../filesystem/project-files";
import { loadFrontendStandard } from "../standard/frontend-standard.service";
import { generateCommitMessage, validateBranchName, validateCommitMessage } from "../standard/validators/git.validator";

const gitProjectSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectPath: z.string().trim().min(1).optional(),
}).strict();

const gitDiffSchema = gitProjectSchema.extend({
  maxBytes: z.number().int().min(1).max(200000).optional(),
}).strict();

const branchNameSchema = gitProjectSchema.extend({
  branchName: z.string().trim().min(1),
}).strict();

const commitMessageSchema = gitProjectSchema.extend({
  message: z.string().trim().min(1),
}).strict();

const generateCommitMessageSchema = gitProjectSchema.extend({
  type: z.string().trim().min(1).optional(),
  scope: z.string().trim().min(1).optional(),
  summary: z.string().trim().min(1),
}).strict();

const reviewSummarySchema = gitProjectSchema.extend({
  changedFiles: z.array(z.string().trim().min(1)).optional(),
}).strict();

async function normalizeGitArgs(context: ToolContext, args: { projectId?: string; projectPath?: string }) {
  if (!args.projectId) return args;
  const project = await resolveProjectRoot(context, args);
  return { projectId: args.projectId, projectPath: project.projectRoot };
}

async function standardFor(context: ToolContext, args: { projectId?: string; projectPath?: string }) {
  const project = await resolveProjectRoot(context, args);
  return loadFrontendStandard(project);
}

async function optionalGitValue<T>(read: (() => Promise<T>) | undefined, fallback: T): Promise<T> {
  if (!read) return fallback;
  try {
    return await read();
  } catch {
    return fallback;
  }
}

export function gitTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.git.status",
      description: "Read Git working tree status for a project using fixed read-only git status/branch commands.",
      riskLevel: "read",
      inputSchema: gitProjectSchema,
      async handler(args, context) {
        const data = await context.services.git.status(await normalizeGitArgs(context, args));
        return ok("ngm.git.status", data);
      },
    },
    {
      name: "ngm.git.diff",
      description: "Read Git diff for a project using a fixed read-only git diff command.",
      riskLevel: "read",
      inputSchema: gitDiffSchema,
      async handler(args, context) {
        const data = await context.services.git.diff(await normalizeGitArgs(context, args));
        return ok("ngm.git.diff", data);
      },
    },
    {
      name: "ngm.git.validateBranchName",
      description: "Validate a branch name against the configured frontend standard.",
      riskLevel: "read",
      inputSchema: branchNameSchema,
      async handler(args, context) {
        const loaded = await standardFor(context, args);
        return ok("ngm.git.validateBranchName", {
          standardSource: loaded.source,
          ...validateBranchName(args.branchName, loaded.standard),
        });
      },
    },
    {
      name: "ngm.git.validateCommitMessage",
      description: "Validate a commit message against the configured frontend standard.",
      riskLevel: "read",
      inputSchema: commitMessageSchema,
      async handler(args, context) {
        const loaded = await standardFor(context, args);
        return ok("ngm.git.validateCommitMessage", {
          standardSource: loaded.source,
          ...validateCommitMessage(args.message, loaded.standard),
        });
      },
    },
    {
      name: "ngm.git.generateCommitMessage",
      description: "Generate a commit message that follows the configured frontend standard.",
      riskLevel: "read",
      inputSchema: generateCommitMessageSchema,
      async handler(args, context) {
        const loaded = await standardFor(context, args);
        const message = generateCommitMessage({
          type: args.type,
          scope: args.scope,
          summary: args.summary,
        }, loaded.standard);
        return ok("ngm.git.generateCommitMessage", {
          message,
          validation: validateCommitMessage(message, loaded.standard),
        });
      },
    },
    {
      name: "ngm.git.generateReviewSummary",
      description: "Generate a compact review summary from changed files and read-only Git context.",
      riskLevel: "read",
      inputSchema: reviewSummarySchema,
      async handler(args, context) {
        const gitArgs = await normalizeGitArgs(context, args);
        const changedFiles = args.changedFiles ?? await optionalGitValue(
          context.services.git.changedFiles ? () => context.services.git.changedFiles!(gitArgs) : undefined,
          []
        );
        const branch = await optionalGitValue(
          context.services.git.currentBranch ? () => context.services.git.currentBranch!(gitArgs) : undefined,
          undefined
        );
        const latest = await optionalGitValue(
          context.services.git.latestLog ? () => context.services.git.latestLog!(gitArgs) : undefined,
          undefined
        );
        return ok("ngm.git.generateReviewSummary", {
          branch,
          latest,
          changedFiles,
          summary: changedFiles.length
            ? `Review ${changedFiles.length} changed file(s): ${changedFiles.slice(0, 8).join(", ")}${changedFiles.length > 8 ? "..." : ""}`
            : "No changed files detected.",
        });
      },
    },
  ];
}
