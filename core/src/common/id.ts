import { randomUUID } from "node:crypto";

/**
 * 生成本地唯一 ID
 * - 默认 12 位，足够本地使用
 * - 可选 prefix，方便日志/调试
 *
 * 示例：
 *   genId()           -> "a9f3c1e2d4ab"
 *   genId("task")     -> "task_a9f3c1e2d4ab"
 *   genId("project")  -> "project_f81d9c2aa901"
 */
export function genId(prefix?: string): string {
    const raw = randomUUID().replace(/-/g, "").slice(0, 12);
    return prefix ? `${prefix}_${raw}` : raw;
}
