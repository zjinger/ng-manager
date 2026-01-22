
import { WorkspaceModel } from "./workspace.model";
import { promises as fsp } from "node:fs";

/**
 * 原子写入 angular.json
 */
export async function writeWorkspace(
    workspace: WorkspaceModel
): Promise<void> {
    const tmpPath = workspace.filePath + ".tmp";
    const content = JSON.stringify(workspace.raw, null, 2);
    await fsp.writeFile(tmpPath, content, "utf-8");
    await fsp.rename(tmpPath, workspace.filePath);
}