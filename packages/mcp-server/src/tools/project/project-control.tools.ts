import type { McpToolDefinition } from "../index";
import type { LocalServerAvailability, ToolContext } from "../../context/tool-context";
import { blocked, controlledFields, isConfirmed, operation } from "../controlled/operation-result";
import { readWorkspacePackageJson } from "../workspace.tools";
import { requiredEnv, requireExecutePolicy } from "../controlled/operation-policy";
import { requireLocalServer } from "../controlled/local-server";
import { ok } from "../../utils/result";
import { runScriptSchema, stopProjectSchema, type StopProjectArgs } from "../controlled/schemas";
import { normalizePackageManager, runtimeConfigForProject } from "./runtime-config";
import { observeLaunch, runtimeRunId, runtimeStatus } from "./launch-status";
import { ProjectResolverService } from "../../services/project-resolver.service";
import { McpErrorCodes } from "../../errors/error-codes";

type StopCandidate = {
  taskId: string;
  spec?: unknown;
  runtime?: unknown;
};

async function findScriptTaskViaServer(context: ToolContext, projectId: string, script: string) {
  const { server, availability } = await requireLocalServer(context);
  if (!server) {
    return { availability, row: undefined };
  }
  const rows = await server.refreshTaskProject(projectId);
  return {
    availability,
    row: rows.find((row) => row?.spec?.name === script),
  };
}

async function findStopCandidates(context: ToolContext, args: StopProjectArgs): Promise<{
  candidates: StopCandidate[];
  controlPlane: "local-server" | "unavailable";
  localServer: LocalServerAvailability;
}> {
  const serverCheck = await requireLocalServer(context);
  if (serverCheck.server) {
    if (args.taskId) {
      try {
        const runtime = await serverCheck.server.getTaskStatus(args.taskId);
        return {
          candidates: runtimeStatus(runtime) === "running" || runtimeStatus(runtime) === "stopping"
            ? [{ taskId: args.taskId, runtime }]
            : [],
          controlPlane: "local-server",
          localServer: serverCheck.availability,
        };
      } catch {
        return { candidates: [], controlPlane: "local-server", localServer: serverCheck.availability };
      }
    }

    if (args.projectId) {
      const project = await projectResolver(context).resolveProject(args.projectId);
      const rows = await serverCheck.server.listTaskViews(project.id);
      return {
        candidates: rows
          .filter((row) => runtimeStatus(row?.runtime) === "running" || runtimeStatus(row?.runtime) === "stopping")
          .filter((row) => !args.script || row?.spec?.name === args.script)
          .map((row) => ({ taskId: row.spec.id, spec: row.spec, runtime: row.runtime })),
        controlPlane: "local-server",
        localServer: serverCheck.availability,
      };
    }

    return {
      candidates: (await serverCheck.server.listActiveTasks()).map((runtime) => ({ taskId: runtime.taskId, runtime })),
      controlPlane: "local-server",
      localServer: serverCheck.availability,
    };
  }

  return {
    candidates: [],
    controlPlane: "unavailable",
    localServer: serverCheck.availability,
  };
}

function hasStopLocator(args: StopProjectArgs): boolean {
  return Boolean(args.taskId || args.projectId);
}

function projectResolver(context: ToolContext): ProjectResolverService {
  return (context.services as any).projectResolver ?? new ProjectResolverService(context.services.core.project as any);
}

function runScriptTool(): McpToolDefinition {
  return {
    name: "ngm_project_run_script",
    description: "Skill ngm-project. Controlled execute tool for running an existing package.json script for a registered ng-manager projectId through the local ng-manager server task runtime. Prefer this over direct shell npm/pnpm/yarn commands so UI, CLI, desktop, WebSocket logs, and audit stay in sync. Previews by default; real execution requires confirm=true and NGM_MCP_ALLOW_EXECUTE=true. It never accepts arbitrary cwd, workspaceRoot, absolute paths, or shell commands.",
    riskLevel: "execute",
    allowPreviewWhenBlocked: true,
    deferPolicyToHandler: true,
      isConfirmed,
      inputSchema: runScriptSchema,
      async handler(args, context) {
      const confirmed = isConfirmed(args);
      if (confirmed) {
        const policyBlock = requireExecutePolicy("execute", "medium", `Run package.json script "${args.script}" for registered project "${args.projectId}".`);
        if (policyBlock) return ok("ngm_project_run_script", { ...controlledFields("execute", true, requiredEnv("execute")), ...policyBlock });
      }
      const project = await projectResolver(context).resolveProject(args.projectId);
      const safetyMessage = `Run package.json script "${args.script}" for managed project "${project.name}".`;

      const packageJson = await readWorkspacePackageJson(project.root, project.root);
      const scriptCommand = packageJson.scripts[args.script];

      if (!scriptCommand) {
        return ok("ngm_project_run_script", blocked("execute", "medium", safetyMessage, "script not found in package.json", {
          project: { id: project.id, name: project.name, path: project.root },
          availableScripts: Object.keys(packageJson.scripts),
        }));
      }

      const packageManager = normalizePackageManager(project.packageManager);
      const requestedRuntime = runtimeConfigForProject(project as any);
      const resolvedRuntime = await context.services.core.nodeRuntime.resolveRuntime(requestedRuntime);
      const preview = {
        ...controlledFields("execute", confirmed, requiredEnv("execute")),
        operation: operation("preview", "execute", "medium", safetyMessage),
        project: { id: project.id, name: project.name, path: project.root },
        script: { name: args.script, command: scriptCommand },
        packageManager,
        requestedRuntime,
        resolvedRuntime,
        logHint: "Use ngm.log.tail with taskId or runId after execution.",
      };

      if (!confirmed) return ok("ngm_project_run_script", preview);
      const serverCheck = await requireLocalServer(context);
      if (!serverCheck.server) {
        return ok("ngm_project_run_script", blocked("execute", "medium", safetyMessage, "local ng-manager server is unavailable; start ng-manager UI/server before executing managed project scripts", {
          ...controlledFields("execute", true, requiredEnv("execute")),
          localServer: serverCheck.availability,
          project: { id: project.id, name: project.name, path: project.root },
          script: args.script,
        }, McpErrorCodes.LOCAL_SERVER_UNAVAILABLE));
      }

      await serverCheck.server.refreshProjectScripts(project.id);
      const { row } = await findScriptTaskViaServer(context, project.id, args.script);
      if (!row?.spec?.runnable) {
        return ok("ngm_project_run_script", blocked("execute", "medium", safetyMessage, "managed task spec was not runnable", {
          project: { id: project.id, name: project.name, path: project.root },
          script: args.script,
        }));
      }

      let runtime: unknown;
      try {
        runtime = await serverCheck.server.startTask(row.spec.id);
      } catch (error) {
        return ok("ngm_project_run_script", {
          ...preview,
          ...controlledFields("execute", true, requiredEnv("execute")),
          operation: operation("failed", "execute", "medium", safetyMessage),
          task: row.spec,
          taskId: row.spec.id,
          controlPlane: "local-server",
          localServer: serverCheck.availability,
          result: { status: "failed", reason: error instanceof Error ? error.message : String(error) },
        });
      }

      const launch = await observeLaunch(context, row.spec.id, runtime, args.waitMs ?? 3000);
      const runId = runtimeRunId(launch.runtime) ?? runtimeRunId(runtime);
      return ok("ngm_project_run_script", {
        ...preview,
        ...controlledFields("execute", true, requiredEnv("execute")),
        operation: operation("executed", "execute", "medium", safetyMessage),
        controlPlane: "local-server",
        localServer: serverCheck.availability,
        task: row.spec,
        taskId: row.spec.id,
        runtime,
        launch,
        logHint: `Use ngm.log.tail with taskId=${row.spec.id}${runId ? ` or runId=${runId}` : ""}.`,
      });
    },
  };
}

function stopProjectTool(): McpToolDefinition {
  return {
    name: "ngm_project_stop",
    description: "Skill ngm-project. Controlled execute tool for stopping ng-manager managed tasks by taskId or registered projectId via the local ng-manager server runtime. Prefer this over kill/taskkill so shared task state, WebSocket logs, and audit stay consistent. Previews by default; real stop requires confirm=true and NGM_MCP_ALLOW_EXECUTE=true. It never kills arbitrary PIDs or unmanaged processes.",
    riskLevel: "execute",
    allowPreviewWhenBlocked: true,
    deferPolicyToHandler: true,
    isConfirmed,
      inputSchema: stopProjectSchema,
      async handler(args, context) {
      const confirmed = isConfirmed(args);
      const safetyMessage = "Stop one ng-manager managed task process.";
      if (args.script && !args.projectId) {
        return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "script stop requires projectId so MCP can resolve a registered ng-manager project", {
          ...controlledFields("execute", confirmed, requiredEnv("execute")),
        }, McpErrorCodes.TOOL_INPUT_INVALID));
      }
      if (confirmed && !hasStopLocator(args)) {
        return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "confirmed stop requires taskId or projectId; MCP will not stop the only active task by inference", {
          ...controlledFields("execute", true, requiredEnv("execute")),
        }, McpErrorCodes.CONFIRM_REQUIRED));
      }
      if (confirmed) {
        const policyBlock = requireExecutePolicy("execute", "medium", safetyMessage);
        if (policyBlock) return ok("ngm_project_stop", { ...controlledFields("execute", true, requiredEnv("execute")), ...policyBlock });
      }

      const { candidates, controlPlane, localServer } = await findStopCandidates(context, args);
      if (controlPlane === "unavailable") {
        return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "ng-manager local server is unavailable; start ngm server or ngm ui before stopping managed tasks", {
          ...controlledFields("execute", confirmed, requiredEnv("execute")),
          localServer,
        }, McpErrorCodes.LOCAL_SERVER_UNAVAILABLE));
      }
      if (candidates.length === 0) return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "no managed running task matched the request"));
      if (candidates.length > 1) return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "multiple managed tasks matched; pass taskId or script", { candidates }));

      const candidate = candidates[0]!;
      const preview = { ...controlledFields("execute", confirmed, requiredEnv("execute")), operation: operation("preview", "execute", "medium", safetyMessage), controlPlane, localServer, target: candidate, taskId: candidate.taskId };
      if (!confirmed) return ok("ngm_project_stop", preview);

      const server = context.services.localServer;
      if (!server) return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "local server client is not configured"));

      const runtime = await server.stopTask(candidate.taskId);
      return ok("ngm_project_stop", { ...preview, ...controlledFields("execute", true, requiredEnv("execute")), operation: operation("executed", "execute", "medium", safetyMessage), runtime, launch: { status: runtimeStatus(runtime) } });
    },
  };
}

export function projectControlTools(): McpToolDefinition[] {
  return [runScriptTool(), stopProjectTool()];
}
