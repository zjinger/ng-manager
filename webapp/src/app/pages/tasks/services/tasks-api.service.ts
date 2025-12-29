import { Injectable } from "@angular/core";

export type TaskRuntime = {
  taskId: string;
  projectId: string;
  name: string;
  status: "idle" | "running" | "stopped" | "failed";
  pid?: number;
  startedAt?: number;
  stoppedAt?: number;
  exitCode?: number | null;
  signal?: string | null;
};

export type StartTaskPayload = {
  id?: string;
  projectId: string;
  name: string;
  command: string;
  cwd: string;
  env?: Record<string, string>;
};

@Injectable({ providedIn: "root" })
export class TasksApiService {

  async listByProject(projectId: string): Promise<TaskRuntime[]> {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/tasks`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async start(payload: StartTaskPayload): Promise<TaskRuntime> {
    const res = await fetch(`/api/tasks/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async stop(taskId: string): Promise<TaskRuntime> {
    const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/stop`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}
