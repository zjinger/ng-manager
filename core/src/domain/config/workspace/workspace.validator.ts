import { WorkspaceModel } from "./workspace.model";
import { AppError } from "../../../common/errors";

/**
 * 基础通用校验（适用于任何配置文件）
 * - 不做 framework-specific 检查（如 projects），由具体 provider 自行补充
 */
export function validateWorkspace(workspace: WorkspaceModel): void {
    const raw = workspace.raw;

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new AppError("CONFIG_READ_FAILED", "Invalid workspace: not a JSON object", {
            filePath: workspace.filePath,
        });
    }
}