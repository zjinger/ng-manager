import type { ProjectNodeRuntimeConfig } from "@yinuo-ngm/project";
import { z } from "zod";
import { projectLocatorSchema, resolveProject } from "./project.tools";
import type { McpToolDefinition } from "./index";
import { ok } from "../utils/result";
import { readWorkspacePackageJson } from "./workspace.tools";
import type { LocalServerAvailability, LocalServerClient, ToolContext } from "../context/tool-context";

const confirmSchema = {
  confirm: z.boolean().optional(),
  dryRun: z.boolean().optional(),
};

const runScriptSchema = projectLocatorSchema.extend({
  script: z.string().trim().min(1),
  waitMs: z.number().int().min(0).max(10000).optional(),
  ...confirmSchema,
}).strict();

const stopProjectSchema = projectLocatorSchema.extend({
  taskId: z.string().trim().min(1).optional(),
  script: z.string().trim().min(1).optional(),
  ...confirmSchema,
}).strict();

const runtimeConfigSchema = z.object({
  type: z.enum(["system", "managed", "custom"]),
  name: z.string().trim().min(1).optional(),
  version: z.string().trim().min(1).optional(),
  nodePath: z.string().trim().min(1).optional(),
  packageManager: z.enum(["npm", "pnpm", "yarn"]).optional(),
}).strict();

const setRuntimeSchema = projectLocatorSchema.extend({
  runtime: runtimeConfigSchema,
  ...confirmSchema,
}).strict();

const nginxReloadSchema = z.object({
  ...confirmSchema,
}).strict();

const nginxProxySaveSchema = z.object({
  serverId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  listen: z.array(z.string().trim().min(1)).min(1).optional(),
  domains: z.array(z.string().trim().min(1)).min(1).optional(),
  target: z.string().trim().min(1),
  locationPath: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  reloadAfterSave: z.boolean().optional(),
  ...confirmSchema,
}).strict();

type NginxProxyRequest = {
  name: string;
  listen: string[];
  domains: string[];
  enabled?: boolean;
  protocol?: "http" | "https";
  ssl?: boolean;
  sslCert?: string;
  sslKey?: string;
  root?: string;
  index?: string[];
  extraConfig?: string;
  locations: Array<{
    path: string;
    proxyPass?: string;
  }>;
  createdBy?: string;
};

type NginxProxySaveArgs = z.infer<typeof nginxProxySaveSchema>;
type StopCandidate = {
  taskId: string;
  spec?: unknown;
  runtime?: unknown;
};

type ControlledStatus = "preview" | "executed" | "blocked" | "failed";
type OperationType = "write" | "execute" | "service-control";
type OperationRisk = "low" | "medium" | "high";
type LaunchStatus = "ready" | "running" | "failed" | "success" | "stopped" | "unknown";

function isConfirmed(args: { confirm?: boolean; dryRun?: boolean }): boolean {
  return args.confirm === true && args.dryRun !== true;
}

function operation(status: ControlledStatus, type: OperationType, risk: OperationRisk, safetyMessage: string) {
  return {
    status,
    type,
    risk,
    safetyMessage,
  };
}

function blocked(type: OperationType, risk: OperationRisk, safetyMessage: string, reason: string, data?: Record<string, unknown>) {
  return {
    operation: operation("blocked", type, risk, safetyMessage),
    reason,
    ...(data ?? {}),
  };
}

function normalizePackageManager(value: unknown): "npm" | "pnpm" | "yarn" {
  return value === "pnpm" || value === "yarn" ? value : "npm";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runtimeStatus(runtime: unknown): string | undefined {
  return typeof (runtime as { status?: unknown } | null)?.status === "string"
    ? ((runtime as { status: string }).status)
    : undefined;
}

function runtimeRunId(runtime: unknown): string | undefined {
  return typeof (runtime as { runId?: unknown } | null)?.runId === "string"
    ? ((runtime as { runId: string }).runId)
    : undefined;
}

function launchStatusFromRuntime(runtime: unknown): LaunchStatus {
  const status = runtimeStatus(runtime);
  if (status === "failed") return "failed";
  if (status === "success") return "success";
  if (status === "stopped") return "stopped";
  if (status === "running") {
    return (runtime as { readyAt?: unknown })?.readyAt ? "ready" : "running";
  }
  return "unknown";
}

function launchMessage(status: LaunchStatus, observedForMs: number): string {
  switch (status) {
    case "ready":
      return "Task is running and emitted a readiness signal.";
    case "running":
      return `Task is still running after ${observedForMs}ms; no failure was observed yet.`;
    case "failed":
      return "Task failed during the observation window.";
    case "success":
      return "Task exited successfully during the observation window.";
    case "stopped":
      return "Task stopped during the observation window.";
    default:
      return "Task status could not be confirmed.";
  }
}

async function localServerAvailability(context: ToolContext): Promise<LocalServerAvailability> {
  if (!context.services.localServer) {
    return { available: false, reason: "local server client is not configured" };
  }
  return context.services.localServer.availability();
}

async function requireLocalServer(context: ToolContext): Promise<{ server?: LocalServerClient; availability: LocalServerAvailability }> {
  const availability = await localServerAvailability(context);
  return {
    server: availability.available ? context.services.localServer : undefined,
    availability,
  };
}

function toRuntimeConfig(input: z.infer<typeof runtimeConfigSchema>): ProjectNodeRuntimeConfig {
  const config: ProjectNodeRuntimeConfig = {
    type: input.type,
  };
  if (input.name !== undefined) config.name = input.name;
  if (input.version !== undefined) config.version = input.version;
  if (input.nodePath !== undefined) config.nodePath = input.nodePath;
  if (input.packageManager !== undefined) config.packageManager = input.packageManager;
  return config;
}

function runtimeConfigForProject(project: Awaited<ReturnType<typeof resolveProject>>): ProjectNodeRuntimeConfig {
  if (project.runtime) {
    return {
      ...project.runtime,
      packageManager: normalizePackageManager(project.runtime.packageManager ?? project.packageManager),
    };
  }

  if (project.nodeVersion) {
    return {
      type: "managed",
      version: project.nodeVersion,
      packageManager: normalizePackageManager(project.packageManager),
    };
  }

  return {
    type: "system",
    packageManager: normalizePackageManager(project.packageManager),
  };
}

function validateTargetRuntime(runtime: ProjectNodeRuntimeConfig): void {
  if (runtime.type === "managed" && !runtime.name && !runtime.version) {
    throw new Error("managed runtime requires name or version");
  }
  if (runtime.type === "custom" && !runtime.nodePath) {
    throw new Error("custom runtime requires nodePath");
  }
}

function validateProxyTarget(target: string): URL {
  if (/[\r\n;{}]/.test(target) || target.includes("`") || target.includes("$(")) {
    throw new Error("target contains unsafe characters");
  }
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new Error("target must be a valid URL");
  }
  const allowed = new Set(["http:", "https:", "ws:", "wss:"]);
  if (!allowed.has(url.protocol)) {
    throw new Error("target protocol must be http, https, ws, or wss");
  }
  if (!url.hostname) {
    throw new Error("target hostname is required");
  }
  return url;
}

function normalizeProxyRequest(args: NginxProxySaveArgs, existing?: Record<string, any> | null): NginxProxyRequest {
  const target = validateProxyTarget(args.target).toString();
  const domains = args.domains ?? existing?.domains;
  const listen = args.listen ?? existing?.listen;
  const name = args.name ?? existing?.name ?? domains?.[0];

  if (!name) {
    throw new Error("name is required when creating a new proxy server");
  }
  if (!domains?.length) {
    throw new Error("domains is required when creating a new proxy server");
  }
  if (!listen?.length) {
    throw new Error("listen is required when creating a new proxy server");
  }

  return {
    name,
    listen,
    domains,
    enabled: args.enabled ?? existing?.enabled ?? true,
    protocol: existing?.ssl ? "https" : "http",
    ssl: existing?.ssl ?? false,
    sslCert: existing?.sslCert,
    sslKey: existing?.sslKey,
    root: existing?.root,
    index: existing?.index,
    extraConfig: existing?.extraConfig,
    locations: [
      {
        path: args.locationPath ?? "/",
        proxyPass: target,
      },
    ],
    createdBy: existing?.createdBy ?? "ngm-mcp",
  };
}

async function findScriptTask(context: ToolContext, projectId: string, script: string) {
  const rows = await context.services.core.task.refreshByProject(projectId);
  return rows.find((row) => row.spec.name === script);
}

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

async function getTaskStatus(context: ToolContext, taskId: string): Promise<unknown> {
  const { server } = await requireLocalServer(context);
  if (server) return server.getTaskStatus(taskId);
  throw new Error("ng-manager local server is unavailable");
}

async function findStopCandidates(context: ToolContext, args: z.infer<typeof stopProjectSchema>): Promise<{
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

async function observeLaunch(context: ToolContext, taskId: string, initialRuntime: unknown, waitMs: number) {
  const start = Date.now();
  let runtime = initialRuntime;
  let status = launchStatusFromRuntime(runtime);

  while (Date.now() - start < waitMs) {
    if (status !== "running") break;
    await sleep(Math.min(250, Math.max(waitMs - (Date.now() - start), 0)));
    try {
      runtime = await getTaskStatus(context, taskId);
      status = launchStatusFromRuntime(runtime);
    } catch {
      break;
    }
  }

  const observedForMs = Date.now() - start;
  return {
    status,
    observedForMs,
    message: launchMessage(status, observedForMs),
    runtime,
  };
}

export function controlledTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm_project_run_script",
      description: "Skill ngm-project. Controlled execute tool for running an existing package.json script through the local ng-manager server task service so UI state stays in sync. Supports dry-run/preview; real execution requires confirm=true and NGM_MCP_ALLOW_EXECUTE=true. It never accepts arbitrary shell commands or project-external paths.",
      riskLevel: "execute",
      allowPreviewWhenBlocked: true,
      isConfirmed,
      inputSchema: runScriptSchema,
      async handler(args, context) {
        const project = await resolveProject(context, args);
        const packageJson = await readWorkspacePackageJson(context.workspaceRoot, project.root);
        const scriptCommand = packageJson.scripts[args.script];
        const safetyMessage = `Run package.json script "${args.script}" for managed project "${project.name}".`;

        if (!scriptCommand) {
          return ok("ngm_project_run_script", blocked("execute", "medium", safetyMessage, "script not found in package.json", {
            project: { id: project.id, name: project.name, root: project.root },
            availableScripts: Object.keys(packageJson.scripts),
          }));
        }

        const packageManager = normalizePackageManager(project.packageManager);
        const requestedRuntime = runtimeConfigForProject(project);
        const resolvedRuntime = await context.services.core.nodeRuntime.resolveRuntime(requestedRuntime);
        const preview = {
          operation: operation("preview", "execute", "medium", safetyMessage),
          project: { id: project.id, name: project.name, root: project.root },
          script: { name: args.script, command: scriptCommand },
          cwd: project.root,
          packageManager,
          requestedRuntime,
          resolvedRuntime,
          logHint: "Use ngm.log.tail with taskId or runId after execution.",
        };

        if (!isConfirmed(args)) {
          return ok("ngm_project_run_script", preview);
        }

        const serverCheck = await requireLocalServer(context);
        if (!serverCheck.server) {
          return ok("ngm_project_run_script", blocked("execute", "medium", safetyMessage, "local ng-manager server is unavailable; start ng-manager UI/server before executing managed project scripts", {
            localServer: serverCheck.availability,
            project: { id: project.id, name: project.name, root: project.root },
            script: args.script,
          }));
        }

        await serverCheck.server.refreshProjectScripts(project.id);
        const { row } = await findScriptTaskViaServer(context, project.id, args.script);
        if (!row?.spec?.runnable) {
          return ok("ngm_project_run_script", blocked("execute", "medium", safetyMessage, "managed task spec was not runnable", {
            project: { id: project.id, name: project.name, root: project.root },
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
            result: {
              status: "failed",
              reason: error instanceof Error ? error.message : String(error),
            },
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
    },
    {
      name: "ngm_project_stop",
      description: "Skill ngm-project. Controlled execute tool for stopping only ng-manager managed task processes. Supports dry-run/preview; real stop requires confirm=true and NGM_MCP_ALLOW_EXECUTE=true. It never kills arbitrary PIDs or unmanaged system processes.",
      riskLevel: "execute",
      allowPreviewWhenBlocked: true,
      isConfirmed,
      inputSchema: stopProjectSchema,
      async handler(args, context) {
        const safetyMessage = "Stop one ng-manager managed task process.";
        const { candidates, controlPlane, localServer } = await findStopCandidates(context, args);

        if (controlPlane === "unavailable") {
          return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "ng-manager local server is unavailable; start ngm server or ngm ui before stopping managed tasks", {
            localServer,
          }));
        }
        if (candidates.length === 0) {
          return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "no managed running task matched the request"));
        }
        if (candidates.length > 1) {
          return ok("ngm_project_stop", blocked("execute", "medium", safetyMessage, "multiple managed tasks matched; pass taskId or script", {
            candidates,
          }));
        }

        const candidate = candidates[0]!;
        const preview = {
          operation: operation("preview", "execute", "medium", safetyMessage),
          controlPlane,
          localServer,
          target: candidate,
        };
        if (!isConfirmed(args)) {
          return ok("ngm_project_stop", preview);
        }

        const runtime = await context.services.localServer!.stopTask(candidate.taskId);
        return ok("ngm_project_stop", {
          ...preview,
          operation: operation("executed", "execute", "medium", safetyMessage),
          runtime,
        });
      },
    },
    {
      name: "ngm_runtime_set_for_project",
      description: "Skill ngm-runtime. Controlled write tool for binding a managed project to a Node runtime config. Supports dry-run/preview; real write requires confirm=true and NGM_MCP_ALLOW_WRITE=true. It does not modify system PATH, nvm, shell profiles, or install runtimes.",
      riskLevel: "write",
      allowPreviewWhenBlocked: true,
      isConfirmed,
      inputSchema: setRuntimeSchema,
      async handler(args, context) {
        const project = await resolveProject(context, args);
        const nextRuntime = toRuntimeConfig(args.runtime);
        validateTargetRuntime(nextRuntime);
        const safetyMessage = `Set Node runtime binding for managed project "${project.name}".`;
        const oldRuntime = runtimeConfigForProject(project);

        let resolvedRuntime: unknown;
        try {
          resolvedRuntime = await context.services.core.nodeRuntime.resolveRuntime(nextRuntime);
        } catch (error) {
          return ok("ngm_runtime_set_for_project", blocked("write", "medium", safetyMessage, "target runtime could not be resolved", {
            error: error instanceof Error ? error.message : String(error),
            nextStep: "Install or register the target Node runtime before binding the project.",
            project: { id: project.id, name: project.name, root: project.root },
            oldRuntime,
            newRuntime: nextRuntime,
          }));
        }

        const preview = {
          operation: operation("preview", "write", "medium", safetyMessage),
          project: { id: project.id, name: project.name, root: project.root },
          diff: {
            oldRuntime,
            newRuntime: nextRuntime,
          },
          resolvedRuntime,
        };

        if (!isConfirmed(args)) {
          return ok("ngm_runtime_set_for_project", preview);
        }

        const serverCheck = await requireLocalServer(context);
        if (!serverCheck.server) {
          return ok("ngm_runtime_set_for_project", blocked("write", "medium", safetyMessage, "ng-manager local server is unavailable; start ngm server or ngm ui before writing project runtime config", {
            localServer: serverCheck.availability,
            project: { id: project.id, name: project.name, root: project.root },
            oldRuntime,
            newRuntime: nextRuntime,
          }));
        }

        const updatedProject = await serverCheck.server.updateProjectRuntime(project.id, nextRuntime);
        const verifiedRuntime = await context.services.core.nodeRuntime.resolveRuntime(nextRuntime);
        return ok("ngm_runtime_set_for_project", {
          ...preview,
          operation: operation("executed", "write", "medium", safetyMessage),
          controlPlane: "local-server",
          localServer: serverCheck.availability,
          project: {
            id: updatedProject.id,
            name: updatedProject.name,
            root: updatedProject.root,
            runtime: updatedProject.runtime,
            nodeVersion: updatedProject.nodeVersion,
          },
          verifiedRuntime,
        });
      },
    },
    {
      name: "ngm_nginx_reload",
      description: "Skill ngm-nginx. Controlled service-control execute tool for reloading only the ng-manager managed local Nginx instance. Supports dry-run/preview; real reload requires confirm=true and NGM_MCP_ALLOW_EXECUTE=true. It validates config before reload and refuses reload when validation fails.",
      riskLevel: "execute",
      allowPreviewWhenBlocked: true,
      isConfirmed,
      inputSchema: nginxReloadSchema,
      async handler(args, context) {
        const nginx = context.services.core.nginx;
        const instance = nginx.service.getInstance();
        const status = await nginx.service.getStatus().catch((error: unknown) => ({
          isRunning: false,
          error: error instanceof Error ? error.message : String(error),
        }));
        const validation = await nginx.config.validateConfig();
        const safetyMessage = "Validate and reload the ng-manager managed local Nginx instance.";
        const preview = {
          operation: operation("preview", "service-control", "high", safetyMessage),
          instance: instance ? { path: instance.path, configPath: instance.configPath } : null,
          status,
          validation,
        };

        if (!validation.valid) {
          return ok("ngm_nginx_reload", {
            ...preview,
            operation: operation("blocked", "service-control", "high", safetyMessage),
            reason: "Nginx config validation failed; reload refused.",
          });
        }

        if (!isConfirmed(args)) {
          return ok("ngm_nginx_reload", preview);
        }

        const result = await nginx.service.reload();
        return ok("ngm_nginx_reload", {
          ...preview,
          operation: operation("executed", "service-control", "high", safetyMessage),
          result,
        });
      },
    },
    {
      name: "ngm_nginx_proxy_save",
      description: "Skill ngm-nginx. Controlled write tool for creating or updating ng-manager managed Nginx proxy server blocks. Supports dry-run/preview; real write requires confirm=true and NGM_MCP_ALLOW_WRITE=true. It validates key proxy fields, does not write arbitrary file paths, and does not reload unless reloadAfterSave=true with execute policy enabled.",
      riskLevel: "write",
      allowPreviewWhenBlocked: true,
      isConfirmed,
      inputSchema: nginxProxySaveSchema,
      async handler(args, context) {
        const nginx = context.services.core.nginx;
        const proxyArgs = args as NginxProxySaveArgs;
        const existing = proxyArgs.serverId ? await nginx.server.getServer(proxyArgs.serverId) : null;
        if (proxyArgs.serverId && !existing) {
          return ok("ngm_nginx_proxy_save", blocked("write", "high", "Save a managed Nginx proxy server block.", "serverId not found"));
        }

        const request = normalizeProxyRequest(proxyArgs, existing as Record<string, any> | null);
        const safetyMessage = `${proxyArgs.serverId ? "Update" : "Create"} ng-manager managed Nginx proxy server "${request.name}".`;
        const preview = {
          operation: operation("preview", "write", "high", safetyMessage),
          mode: proxyArgs.serverId ? "update" : "create",
          serverId: proxyArgs.serverId,
          before: existing,
          afterRequest: request,
          reloadAfterSave: proxyArgs.reloadAfterSave === true,
          reloadRequired: true,
        };

        if (!isConfirmed(proxyArgs)) {
          return ok("ngm_nginx_proxy_save", preview);
        }

        const saved = proxyArgs.serverId
          ? await nginx.server.updateServer(proxyArgs.serverId, request)
          : await nginx.server.createServer(request);
        const validation = await nginx.config.validateConfig();
        const result: Record<string, unknown> = {
          ...preview,
          operation: operation("executed", "write", "high", safetyMessage),
          server: saved,
          validation,
          reloadRequired: true,
        };

        if (proxyArgs.reloadAfterSave === true) {
          if (process.env.NGM_MCP_ALLOW_EXECUTE !== "true") {
            result.reload = {
              status: "blocked",
              reason: "reloadAfterSave requires NGM_MCP_ALLOW_EXECUTE=true",
            };
          } else if (!validation.valid) {
            result.reload = {
              status: "blocked",
              reason: "Nginx config validation failed after save",
            };
          } else {
            result.reload = {
              status: "executed",
              result: await nginx.service.reload(),
            };
            result.reloadRequired = false;
          }
        }

        return ok("ngm_nginx_proxy_save", result);
      },
    },
  ];
}
