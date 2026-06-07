import { z } from "zod";
import type { McpToolDefinition } from "../index";
import { ok } from "../../utils/result";
import { resolveProjectRoot } from "../../filesystem/project-files";
import { blocked, isConfirmed, operation } from "../controlled/operation-result";
import { requireWritePolicy } from "../controlled/operation-policy";
import { loadFrontendStandard, validateFrontendProject } from "../../standard/frontend-standard.service";
import { createFrontendTask, createTaskId, deliveryReportMarkdown, devPlanMarkdown, readFrontendTask, writeTaskMarkdown } from "../../workflow/frontend-task.service";

const projectSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectPath: z.string().trim().min(1).optional(),
}).strict();

const createTaskSchema = projectSchema.extend({
  taskId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  confirm: z.boolean().optional(),
  dryRun: z.boolean().optional(),
}).strict();

const devPlanSchema = projectSchema.extend({
  taskId: z.string().trim().min(1),
  title: z.string().trim().min(1).optional(),
  context: z.string().optional(),
  acceptance: z.array(z.string().trim().min(1)).optional(),
  confirm: z.boolean().optional(),
  dryRun: z.boolean().optional(),
}).strict();

const validateSchema = projectSchema.extend({
  taskId: z.string().trim().min(1).optional(),
}).strict();

const deliverySchema = projectSchema.extend({
  taskId: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  verification: z.array(z.string().trim().min(1)).optional(),
  risks: z.array(z.string().trim().min(1)).optional(),
  confirm: z.boolean().optional(),
  dryRun: z.boolean().optional(),
}).strict();

function writePreview(tool: string, safetyMessage: string, data: Record<string, unknown>) {
  return ok(tool, {
    operation: operation("preview", "write", "low", safetyMessage),
    ...data,
  });
}

export function frontendWorkflowTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.workflow.createFrontendTask",
      description: "Preview or create .ng-manager/frontend-tasks/{taskId}/task.json for a frontend workflow task.",
      riskLevel: "write",
      allowPreviewWhenBlocked: true,
      deferPolicyToHandler: true,
      isConfirmed,
      inputSchema: createTaskSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const taskId = args.taskId || createTaskId(args.title);
        const safetyMessage = "Create frontend workflow task metadata under project .ng-manager/frontend-tasks.";
        if (!isConfirmed(args)) {
          return writePreview("ngm.workflow.createFrontendTask", safetyMessage, {
            project,
            task: { taskId, title: args.title, description: args.description, status: "draft" },
          });
        }
        const policyBlock = requireWritePolicy("low", safetyMessage);
        if (policyBlock) return ok("ngm.workflow.createFrontendTask", policyBlock);
        const result = await createFrontendTask(project, {
          taskId: args.taskId,
          title: args.title,
          description: args.description,
        });
        return ok("ngm.workflow.createFrontendTask", {
          operation: operation("executed", "write", "low", safetyMessage),
          project,
          task: result.task,
          changedFiles: result.changedFiles,
        });
      },
    },
    {
      name: "ngm.workflow.generateDevPlan",
      description: "Preview or write .ng-manager/frontend-tasks/{taskId}/dev-plan.md and advance task status to plan-ready.",
      riskLevel: "write",
      allowPreviewWhenBlocked: true,
      deferPolicyToHandler: true,
      isConfirmed,
      inputSchema: devPlanSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const task = await readFrontendTask(project, args.taskId).catch(() => undefined);
        const title = args.title || task?.title || args.taskId;
        const markdown = devPlanMarkdown({ taskId: args.taskId, title, context: args.context, acceptance: args.acceptance });
        const safetyMessage = "Write frontend development plan under project .ng-manager/frontend-tasks.";
        if (!isConfirmed(args)) {
          return writePreview("ngm.workflow.generateDevPlan", safetyMessage, { project, taskId: args.taskId, markdown });
        }
        const policyBlock = requireWritePolicy("low", safetyMessage);
        if (policyBlock) return ok("ngm.workflow.generateDevPlan", policyBlock);
        if (!task) return ok("ngm.workflow.generateDevPlan", blocked("write", "low", safetyMessage, "task.json was not found; create the frontend task first"));
        const result = await writeTaskMarkdown(project, args.taskId, "dev-plan.md", markdown, "plan-ready");
        return ok("ngm.workflow.generateDevPlan", {
          operation: operation("executed", "write", "low", safetyMessage),
          project,
          task: result.task,
          changedFiles: result.changedFiles,
        });
      },
    },
    {
      name: "ngm.workflow.validateBeforeWrite",
      description: "Run lightweight frontend project validation before AI writes source changes.",
      riskLevel: "read",
      inputSchema: validateSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        const validation = await validateFrontendProject(project, loaded.standard);
        return ok("ngm.workflow.validateBeforeWrite", { project, taskId: args.taskId, ...validation });
      },
    },
    {
      name: "ngm.workflow.validateBeforeCommit",
      description: "Run lightweight frontend validation and Git changed-file scan before commit.",
      riskLevel: "read",
      inputSchema: validateSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        const validation = await validateFrontendProject(project, loaded.standard);
        let changedFiles: string[] = [];
        if (context.services.git.changedFiles) {
          try {
            changedFiles = await context.services.git.changedFiles({ ...args, projectPath: project.projectRoot });
          } catch {
            changedFiles = [];
          }
        }
        return ok("ngm.workflow.validateBeforeCommit", { project, taskId: args.taskId, changedFiles, ...validation });
      },
    },
    {
      name: "ngm.workflow.generateDeliveryReport",
      description: "Preview or write .ng-manager/frontend-tasks/{taskId}/delivery-report.md and advance task status to delivered.",
      riskLevel: "write",
      allowPreviewWhenBlocked: true,
      deferPolicyToHandler: true,
      isConfirmed,
      inputSchema: deliverySchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const markdown = deliveryReportMarkdown({
          taskId: args.taskId,
          summary: args.summary,
          verification: args.verification,
          risks: args.risks,
        });
        const safetyMessage = "Write frontend delivery report under project .ng-manager/frontend-tasks.";
        if (!isConfirmed(args)) {
          return writePreview("ngm.workflow.generateDeliveryReport", safetyMessage, { project, taskId: args.taskId, markdown });
        }
        const policyBlock = requireWritePolicy("low", safetyMessage);
        if (policyBlock) return ok("ngm.workflow.generateDeliveryReport", policyBlock);
        const task = await readFrontendTask(project, args.taskId).catch(() => undefined);
        if (!task) return ok("ngm.workflow.generateDeliveryReport", blocked("write", "low", safetyMessage, "task.json was not found; create the frontend task first"));
        const result = await writeTaskMarkdown(project, args.taskId, "delivery-report.md", markdown, "delivered");
        return ok("ngm.workflow.generateDeliveryReport", {
          operation: operation("executed", "write", "low", safetyMessage),
          project,
          task: result.task,
          changedFiles: result.changedFiles,
        });
      },
    },
  ];
}
