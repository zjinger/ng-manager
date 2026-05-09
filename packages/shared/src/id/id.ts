import { createHash, randomUUID } from "node:crypto";

/**
 * 生成本地唯一 ID
 * - 默认 12 位，足够本地使用
 * - 可选 prefix，方便日志/调试
 */
export function genId(prefix?: string): string {
  const raw = randomUUID().replace(/-/g, "").slice(0, 12);
  return prefix ? `${prefix}_${raw}` : raw;
}

/**
 * 根据 projectId 和 scriptName 生成任务规格 ID
 */
export function buildSpecId(projectId: string, scriptName: string): string {
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
