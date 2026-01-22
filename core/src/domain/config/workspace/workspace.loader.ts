
import * as path from "node:path";
import { promises as fsp } from "node:fs";

import { WorkspaceModel } from "./workspace.model";
import { AppError } from "../../../common/errors";

/**
 * 读 angular.json
 */
export async function loadWorkspace(
    projectRoot: string,
    relPath: string
): Promise<WorkspaceModel> {
    const filePath = path.join(projectRoot, relPath);

    try {
        const content = await fsp.readFile(filePath, "utf-8");
        const raw = JSON.parse(content);
        return { raw, filePath };
    } catch (e: any) {
        throw new AppError("CONFIG_READ_FAILED", e?.message || "Failed to read config file", {
            projectRoot,
            relPath,
            filePath,
        });
    }
}
