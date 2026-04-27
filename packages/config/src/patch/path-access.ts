import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";

export function getByDotPath(obj: any, path: string): any {
  const parts = path.split(".").filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

export function setByDotPath(obj: any, path: string, value: any, createMissing = true): void {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return;

  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];

    if (cur[k] == null) {
      if (!createMissing) {
        throw new CoreError(CoreErrorCodes.INVALID_PARENT_DIR, `Path not exists: ${parts.slice(0, i + 1).join(".")}`);
      }
      cur[k] = {};
    }

    if (typeof cur[k] !== "object") {
      if (!createMissing) {
        throw new CoreError(CoreErrorCodes.INVALID_NAME, `Path is not an object: ${parts.slice(0, i + 1).join(".")}`);
      }
      cur[k] = {};
    }

    cur = cur[k];
  }

  cur[parts[parts.length - 1]] = value;
}
