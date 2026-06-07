import { existsSync } from "fs";
import type { McpToolDefinition } from "../index";
import type { LocalServerAvailability, ToolContext } from "../../context/tool-context";
import { blocked, isConfirmed, operation } from "../controlled/operation-result";
import { readWorkspacePackageJson } from "../workspace.tools";
import { requireExecutePolicy } from "../controlled/operation-policy";
import { requireLocalServer } from "../controlled/local-server";
import { resolveProject } from "../project.tools";
import { ok } from "../../utils/result";
import { runScriptSchema, stopProjectSchema, type StopProjectArgs } from "../controlled/schemas";
import { normalizePackageManager, runtimeConfigForProject } from "./runtime-config";
import { observeLaunch, runtimeRunId, runtimeStatus } from "./launch-status";

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

    if (args.projectId || args.projectPath) {
      const project = await resolveProject(context, args);
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
  return Boolean(args.taskId || args.projectId || args.projectPath);
}

function runScriptTool(): McpToolDefinition {
  return {
    name: "ngm_project_run_script",
    description: "Skill ngm-project. Controlled execute tool for running an existing package.json script through the local ng-manager server task service so UI state stays in sync. Supports dry-run/preview; real execution requires confirm=true and NGM_MCP_ALLOW_EXECUTE=true. It never accepts arbitrary shell commands or project-external paths.",
    riskLevel: "execute",
    allowPreviewWhenBlocked: true,
    isConfirmed,
    inputSchema: runScriptSchema,
    async handler(args, context) {
      const project = await resolveProject(context, args);
      const safetyMessage = `Run package.json script "${args.script}" for managed project "${project.name}".`;
      if (!existsSync(project.root)) {
        return ok("ngm_project_run_script", blocked("execute", "medium", safetyMessage, "registered project path does not exist", {
          project: { id: project.id, name: project.name, path: project.root },
        }));
      }

      const packageJson = await readWorkspacePackageJson(project.root, project.root);
      const scriptCommand = packageJson.scripts[args.script];

      if (!scriptCommand) {
        return ok("ngm_project_run_script", blocked("execute", "medium", safetyMessage, "script not found in package.json", {
          project: { id: project.id, name: project.name, path: project.root },
          availableScripts: Object.keys(packageJson.scripts),
        }));
      }

      const packageManager = normalizePackageManager(project.packageManager);
      const requestedRuntime = runtimeConfigForProject(project);
      const resolvedRuntime = await context.services.core.nodeRuntime.resolveRuntime(requestedRuntime);
      const preview = {
        operation: operation("preview", "execute", "medium", safetyMessage),
        project: { id: project.id, name: project.name, path: project.root },
        script: { name: args.script, command: scriptCommand },
        cwd: project.root,
        packageManager,
        requestedRuntime,
        resolvedRuntime,
        logHint: "Use ngm.log.tail with taskId or runId after execution.",
      };

      if (!isConfirmed(args)) return ok("ngm_project_run_script", preview);
      const policyBlock = requireExecutePolicy("execute", "medium", safetyMessage);
      if (policyBlock) return ok("ngm_project_run_script", policyBlock);

      const serverCheck = await requireLocalServer(context);
      if (!serverCheck.server) {
        return ok("ngm_project_run_script", blocked("execute", "medium", safetyMessage, "local ng-manager server is unavailable; start ng-manager UI/server before executing managed project scripts", {
          localServer: serverCheck.availability,
          project: { id: project.id, name: project.name, path: project.root },
          script: args.script,
        }));
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
          operation: operation("failed", "execute", "medium", safetyMessage),
          task: row.spec,
          controlPlane: "local-server",
          localServer: serverCheck.availability,
          result: { status: "failed", reason: error instanceof Error ? error.message : String(error) },
        });
      }

      const launch = await observeLaunch(context, row.spec.id, runtime, args.waitMs ?? 3000);
      const runId = runtimeRunId(launch.runtime) ?? runtimeRunId(runtime);
      return ok("ngm_project_run_script", {
        ...preview,
        operation: operation("executed", "execute", "medium", safetyMessage),
        controlPlane: "local-server",
        localServer: serverCheck.availability,
        task: row.spec,
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
    description: "Skill ngm-project. Controlled execute tool for stopping only ng-manager managed task processes. Supports dry-run/preview; real stop requires confirm=true and NGM_MCP_ALLOW_EXECUTE=true. It never kills arbitrary PIDs or unmanaged system processes.",
    riskLevel: "execute",
    allowPreviewWhenBlocked: true,
    isConfirmed,
    inputSchema: stopProjectSchema,
    async handler(args, context) {
      const safetyMessage = "Stop one ng-manager managed task process.";
      if (isConfirmed(args) && !hasStopLocator(args)) {
        return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "confirmed stop requires taskId, projectId, or projectPath; MCP will not stop the only active task by inference"));
      }

      const { candidates, controlPlane, localServer } = await findStopCandidates(context, args);
      if (controlPlane === "unavailable") {
        return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "ng-manager local server is unavailable; start ngm server or ngm ui before stopping managed tasks", { localServer }));
      }
      if (candidates.length === 0) return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "no managed running task matched the request"));
      if (candidates.length > 1) return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "multiple managed tasks matched; pass taskId or script", { candidates }));

      const candidate = candidates[0]!;
      const preview = { operation: operation("preview", "execute", "medium", safetyMessage), controlPlane, localServer, target: candidate };
      if (!isConfirmed(args)) return ok("ngm_project_stop", preview);

      const policyBlock = requireExecutePolicy("execute", "medium", safetyMessage);
      if (policyBlock) return ok("ngm_project_stop", policyBlock);
      const server = context.services.localServer;
      if (!server) return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "local server client is not configured"));

      const runtime = await server.stopTask(candidate.taskId);
      return ok("ngm_project_stop", { ...preview, operation: operation("executed", "execute", "medium", safetyMessage), runtime });
    },
  };
}

export function projectControlTools(): McpToolDefinition[] {
  return [runScriptTool(), stopProjectTool()];
}
