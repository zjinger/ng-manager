import { z } from "zod";
import type { McpToolDefinition } from "../index";
import type { ToolContext } from "../../context/tool-context";
import { ok } from "../../utils/result";
import { resolveProjectRoot, projectRelativePath, validateSafeId, writeTextFile } from "../../filesystem/project-files";
import { blocked, isConfirmed, operation } from "../controlled/operation-result";
import { requireWritePolicy } from "../controlled/operation-policy";
import { loadFrontendStandard, scanFrontendProject, validateFrontendProject } from "../../standard/frontend-standard.service";
import { detectReviewRisks, generateReviewMarkdown, reviewChecklist } from "../../standard/validators/review.validator";
import { readFrontendTask, taskFile, updateFrontendTask } from "../../workflow/frontend-task.service";
import { canTransitionWorkflowStatus, workflowTransitionReason } from "../../workflow/workflow-transition";

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
      name: "ngm_review_scan_changed_files",
      description: "Read changed files from a fixed read-only git status command, or echo provided changedFiles.",
      riskLevel: "read",
      inputSchema: changedFilesSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const changedFiles = await readChangedFiles(context, args, project.projectRoot);
        return ok("ngm_review_scan_changed_files", { project, changedFiles });
      },
    },
    {
      name: "ngm_review_generate_checklist",
      description: "Generate a frontend code review checklist for the current changed files.",
      riskLevel: "read",
      inputSchema: changedFilesSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const changedFiles = await readChangedFiles(context, args, project.projectRoot);
        return ok("ngm_review_generate_checklist", { changedFiles, checklist: reviewChecklist(changedFiles) });
      },
    },
    {
      name: "ngm_review_detect_risks",
      description: "Detect lightweight review risks in changed frontend files.",
      riskLevel: "read",
      inputSchema: changedFilesSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        const changedFiles = await readChangedFiles(context, args, project.projectRoot);
        const files = await scanFrontendProject(project.projectRoot);
        return ok("ngm_review_detect_risks", {
          changedFiles,
          ...detectReviewRisks(files, changedFiles, loaded.standard),
        });
      },
    },
    {
      name: "ngm_review_generate_report",
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
        const reportPath = taskFile(project.projectRoot, args.taskId, "review-report.md");
        const safetyMessage = "Write frontend code review report under project .ng-manager/frontend-tasks.";
        const preview = {
          operation: operation("preview", "write", "low", safetyMessage),
          project,
          taskId: args.taskId,
          path: projectRelativePath(project.projectRoot, reportPath),
          changedFiles,
          markdown,
        };
        if (!isConfirmed(args)) return ok("ngm_review_generate_report", preview);
        const policyBlock = requireWritePolicy("low", safetyMessage);
        if (policyBlock) return ok("ngm_review_generate_report", policyBlock);
        try {
          const task = await readFrontendTask(project, args.taskId);
          if (!canTransitionWorkflowStatus(task.status, "review-ready")) {
            return ok("ngm_review_generate_report", blocked("write", "low", safetyMessage, workflowTransitionReason(task.status, "review-ready")));
          }
          await writeTextFile(reportPath, markdown);
          await updateFrontendTask(project, args.taskId, {
            status: "review-ready",
            changedFiles,
            checks: {
              standard: projectChecks.status === "passed" || projectChecks.status === "warning" || projectChecks.status === "failed" || projectChecks.status === "blocked" ? projectChecks.status : "pending",
              test: projectChecks.checks.missingSpecs.status === "passed" || projectChecks.checks.missingSpecs.status === "warning" || projectChecks.checks.missingSpecs.status === "failed" || projectChecks.checks.missingSpecs.status === "blocked" ? projectChecks.checks.missingSpecs.status : "pending",
              review: risks.status === "passed" || risks.status === "warning" || risks.status === "failed" || risks.status === "blocked" ? risks.status : "pending",
              build: "pending",
            },
          });
        } catch (error) {
          return ok("ngm_review_generate_report", blocked("write", "low", safetyMessage, error instanceof Error ? error.message : String(error)));
        }
        return ok("ngm_review_generate_report", {
          ...preview,
          operation: operation("executed", "write", "low", safetyMessage),
          changedFiles: [
            projectRelativePath(project.projectRoot, reportPath),
            `.ng-manager/frontend-tasks/${args.taskId}/task.json`,
          ],
        });
      },
    },
  ];
}
