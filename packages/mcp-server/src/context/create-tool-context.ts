import * as os from "os";
import * as path from "path";
import { createCoreApp } from "@yinuo-ngm/core";
import type { ToolContext } from "./tool-context";
import { createLocalServerClient } from "./local-server-client";
import { createLocalGitReadService } from "../git/local-git-read-service";

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
      git: createLocalGitReadService(workspaceRoot),
      localServer: createLocalServerClient(),
    },
    async dispose() {
      await core.dispose();
    },
  };
}
