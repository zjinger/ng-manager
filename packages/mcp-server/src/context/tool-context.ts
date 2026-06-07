import type { CoreApp } from "@yinuo-ngm/core";

export type GitReadService = {
  status(input: { projectId?: string; projectPath?: string }): Promise<unknown>;
  diff(input: { projectId?: string; projectPath?: string; maxBytes?: number }): Promise<unknown>;
};

export type LocalServerAvailability = {
  available: boolean;
  url?: string;
  reason?: string;
};

export type LocalServerClient = {
  availability(): Promise<LocalServerAvailability>;
  refreshTaskProject(projectId: string): Promise<any[]>;
  refreshProjectScripts(projectId: string): Promise<any>;
  updateProjectRuntime(projectId: string, runtime: unknown): Promise<any>;
  listTaskViews(projectId: string): Promise<any[]>;
  listActiveTasks(): Promise<any[]>;
  startTask(taskId: string): Promise<any>;
  stopTask(taskId: string): Promise<any>;
  getTaskStatus(taskId: string): Promise<any>;
  getTaskLogTail(runId: string, tail: number): Promise<any[]>;
};

export type ToolServices = {
  core: CoreApp;
  git: GitReadService;
  localServer?: LocalServerClient;
};

export type ToolContext = {
  workspaceRoot: string;
  dataDir: string;
  services: ToolServices;
  dispose(): Promise<void>;
};
