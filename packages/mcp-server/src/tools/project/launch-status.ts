import type { ToolContext } from "../../context/tool-context";
import { requireLocalServer } from "../controlled/local-server";

export type LaunchStatus = "ready" | "running" | "failed" | "success" | "stopped" | "unknown";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function runtimeStatus(runtime: unknown): string | undefined {
  return typeof (runtime as { status?: unknown } | null)?.status === "string"
    ? ((runtime as { status: string }).status)
    : undefined;
}

export function runtimeRunId(runtime: unknown): string | undefined {
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

async function getTaskStatus(context: ToolContext, taskId: string): Promise<unknown> {
  const { server } = await requireLocalServer(context);
  if (server) return server.getTaskStatus(taskId);
  throw new Error("ng-manager local server is unavailable");
}

export async function observeLaunch(context: ToolContext, taskId: string, initialRuntime: unknown, waitMs: number) {
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
