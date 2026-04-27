import { randomUUID } from "node:crypto";
import { createHash } from "crypto";

/**
 * 生成本地唯一 ID
 * - 默认 12 位，足够本地使用
 * - 可选 prefix，方便日志/调试
 *
 * 示例：
 *   genId()           -> "a9f3c1e2d4ab"
 *   genId("project")  -> "project_f81d9c2aa901"
 *  @param prefix 可选前缀
 *  @return 生成的唯一 ID 字符串
 */
export function genId(prefix?: string): string {
    const raw = randomUUID().replace(/-/g, "").slice(0, 12);
    return prefix ? `${prefix}_${raw}` : raw;
}

/**
 * 根据 projectId 和 scriptName 生成任务规格 ID
 * @param projectId
 * @param scriptName
 * @returns
 */
export function buildSpecId(projectId: string, scriptName: string) {
    const h = createHash("sha1")
        .update(`${projectId}::${scriptName}`, "utf8")
        .digest("hex")
        .slice(0, 10);
    return `task:${projectId}:${h}`;
}

/** 生成本地唯一 ID（别名） */
export const uid = genId;

/** 根据 projectId 和 scriptName 生成任务规格 ID（别名） */
export const buildTaskId = buildSpecId;
