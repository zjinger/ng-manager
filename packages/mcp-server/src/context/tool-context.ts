import type { CoreApp } from "@yinuo-ngm/core";

export type GitReadService = {
  status(input: { projectId?: string; projectPath?: string }): Promise<unknown>;
  diff(input: { projectId?: string; projectPath?: string; maxBytes?: number }): Promise<unknown>;
};

export type ToolServices = {
  core: CoreApp;
  git: GitReadService;
};

export type ToolContext = {
  workspaceRoot: string;
  dataDir: string;
  services: ToolServices;
  dispose(): Promise<void>;
};
