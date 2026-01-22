/**
 * 统一的 dot-path 访问器
 * - MVP：仅支持 a.b.c
 * - 未来：可扩展到 a.b[0].c 等复杂路径
 */

/** 读取：obj.a.b.c */
export function getByDotPath(obj: any, path: string): any {
  const parts = path.split(".").filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * 写入：obj.a.b.c = value
 * @param createMissing 默认 true：中间对象不存在则自动创建（兼容你现有行为）
 *                     false：路径不存在直接抛错（严格模式，避免写错 key 悄悄污染文件）
 */
export function setByDotPath(obj: any, path: string, value: any, createMissing = true): void {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return;

  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];

    if (cur[k] == null) {
      if (!createMissing) {
        throw new Error(`Path not exists: ${parts.slice(0, i + 1).join(".")}`);
      }
      cur[k] = {};
    }

    if (typeof cur[k] !== "object") {
      if (!createMissing) {
        throw new Error(`Path is not an object: ${parts.slice(0, i + 1).join(".")}`);
      }
      cur[k] = {};
    }

    cur = cur[k];
  }

  cur[parts[parts.length - 1]] = value;
}
