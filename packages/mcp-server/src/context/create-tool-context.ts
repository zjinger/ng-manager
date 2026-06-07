import * as os from "os";
import * as path from "path";
import { createCoreApp } from "@yinuo-ngm/core";
import type { ToolContext } from "./tool-context";
import { createLocalServerClient } from "./local-server-client";
import { createLocalGitReadService } from "../git/local-git-read-service";
import { PathGuardService } from "../services/path-guard.service";
import { PermissionService } from "../services/permission.service";
import { ProjectResolverService } from "../services/project-resolver.service";

export async function createToolContext(): Promise<ToolContext> {
  const dataDir = process.env.NGM_DATA_DIR || path.join(os.homedir(), ".ng-manager");
  const workspaceRoot = process.cwd();
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
      pathGuard: new PathGuardService(),
      permission: new PermissionService(),
      projectResolver: new ProjectResolverService(core.project as any),
      localServer: createLocalServerClient(),
    },
    async dispose() {
      await core.dispose();
    },
  };
}
