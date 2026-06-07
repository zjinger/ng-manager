import { z } from "zod";
import type { McpToolDefinition } from "../index";
import type { ToolContext } from "../../context/tool-context";
import { ok } from "../../utils/result";
import { resolveNgManagerPath, resolveProjectRoot, projectRelativePath, validateSafeId, writeTextFile } from "../../filesystem/project-files";
import { blocked, isConfirmed, operation } from "../controlled/operation-result";
import { requireWritePolicy } from "../controlled/operation-policy";
import { loadFrontendStandard, scanFrontendProject, validateFrontendProject } from "../../standard/frontend-standard.service";
import { detectReviewRisks, generateReviewMarkdown, reviewChecklist } from "../../standard/validators/review.validator";

const projectSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectPath: z.string().trim().min(1).optional(),
}).strict();

const changedFilesSchema = projectSchema.extend({
  changedFiles: z.array(z.string().trim().min(1)).optional(),
}).strict();

const reportSchema = changedFilesSchema.extend({
  taskId: z.string().trim().min(1),
  confirm: z.boolean().optional(),
  dryRun: z.boolean().optional(),
}).strict();

async function readChangedFiles(context: ToolContext, args: z.infer<typeof changedFilesSchema>, projectRoot: string): Promise<string[]> {
  if (args.changedFiles) return args.changedFiles.map((item) => item.replace(/\\/g, "/"));
  const gitArgs = { ...args, projectPath: projectRoot };
  if (!context.services.git.changedFiles) return [];
  try {
    return await context.services.git.changedFiles(gitArgs);
  } catch {
    return [];
  }
}

export function reviewTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.review.scanChangedFiles",
      description: "Read changed files from a fixed read-only git status command, or echo provided changedFiles.",
      riskLevel: "read",
      inputSchema: changedFilesSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const changedFiles = await readChangedFiles(context, args, project.projectRoot);
        return ok("ngm.review.scanChangedFiles", { project, changedFiles });
      },
    },
    {
      name: "ngm.review.generateChecklist",
      description: "Generate a frontend code review checklist for the current changed files.",
      riskLevel: "read",
      inputSchema: changedFilesSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const changedFiles = await readChangedFiles(context, args, project.projectRoot);
        return ok("ngm.review.generateChecklist", { changedFiles, checklist: reviewChecklist(changedFiles) });
      },
    },
    {
      name: "ngm.review.detectRisks",
      description: "Detect lightweight review risks in changed frontend files.",
      riskLevel: "read",
      inputSchema: changedFilesSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        const changedFiles = await readChangedFiles(context, args, project.projectRoot);
        const files = await scanFrontendProject(project.projectRoot);
        return ok("ngm.review.detectRisks", {
          changedFiles,
          ...detectReviewRisks(files, changedFiles, loaded.standard),
        });
      },
    },
    {
      name: "ngm.review.generateReport",
      description: "Preview or write .ng-manager/reports/review-{taskId}.md with changed files, automated checks, risks, suggestions, and manual confirmation items.",
      riskLevel: "write",
      allowPreviewWhenBlocked: true,
      deferPolicyToHandler: true,
      isConfirmed,
      inputSchema: reportSchema,
      async handler(args, context) {
        validateSafeId("taskId", args.taskId);
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        const changedFiles = await readChangedFiles(context, args, project.projectRoot);
        const files = await scanFrontendProject(project.projectRoot);
        const projectChecks = await validateFrontendProject(project, loaded.standard);
        const risks = detectReviewRisks(files, changedFiles, loaded.standard);
        const checklist = reviewChecklist(changedFiles);
        const markdown = generateReviewMarkdown({
          taskId: args.taskId,
          changedFiles,
          checks: Object.entries(projectChecks.checks).map(([title, check]) => ({
            title,
            status: check.status,
            findings: check.findings,
          })),
          risks: risks.findings,
          checklist,
        });
        const reportPath = resolveNgManagerPath(project.projectRoot, "reports", `review-${args.taskId}.md`);
        const safetyMessage = "Write frontend code review report under project .ng-manager/reports.";
        const preview = {
          operation: operation("preview", "write", "low", safetyMessage),
          project,
          taskId: args.taskId,
          path: projectRelativePath(project.projectRoot, reportPath),
          changedFiles,
          markdown,
        };
        if (!isConfirmed(args)) return ok("ngm.review.generateReport", preview);
        const policyBlock = requireWritePolicy("low", safetyMessage);
        if (policyBlock) return ok("ngm.review.generateReport", policyBlock);
        try {
          await writeTextFile(reportPath, markdown);
        } catch (error) {
          return ok("ngm.review.generateReport", blocked("write", "low", safetyMessage, error instanceof Error ? error.message : String(error)));
        }
        return ok("ngm.review.generateReport", {
          ...preview,
          operation: operation("executed", "write", "low", safetyMessage),
          changedFiles: [projectRelativePath(project.projectRoot, reportPath)],
        });
      },
    },
  ];
}
