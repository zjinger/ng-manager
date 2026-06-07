import * as os from "os";
import * as path from "path";
import { createCoreApp } from "@yinuo-ngm/core";
import type { GitReadService, ToolContext } from "./tool-context";
import { createLocalServerClient } from "./local-server-client";

const gitStub: GitReadService = {
  async status() {
    throw new Error("Git service is not implemented in core yet");
  },
  async diff() {
    throw new Error("Git service is not implemented in core yet");
  },
};

export async function createToolContext(): Promise<ToolContext> {
  const dataDir = process.env.NGM_DATA_DIR || path.join(os.homedir(), ".ng-manager");
  const workspaceRoot = process.env.NGM_WORKSPACE_ROOT || process.cwd();
  const core = await createCoreApp({
    dataDir,
    sysLogCapacity: 3000,
  });

  return {
    workspaceRoot,
    dataDir,
    services: {
      core,
      git: gitStub,
      localServer: createLocalServerClient(),
    },
    async dispose() {
      await core.dispose();
    },
  };
}
