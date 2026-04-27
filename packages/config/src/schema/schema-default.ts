import type { ConfigSchema } from "./schema.types";

/**
 * 根据 ConfigSchema 中 item.default，对 VM 应用默认值
 * 规则：
 * - 仅当当前值 === undefined 时才写 default
 * - null / false / "" 都视为"用户显式值"，不会覆盖
 */
export function applySchemaDefaults<T extends object>(
    vm: T,
    schema: ConfigSchema
): T {
    const next = structuredClone(vm);

    for (const section of schema.sections) {
        for (const item of section.items) {
            if (!item.key || item.default === undefined) continue;

            const cur = getByPath(next, item.key);
            if (cur === undefined) {
                setByPath(next, item.key, item.default);
            }
        }
    }

    return next;
}

/* ---------- helpers ---------- */

export function getByPath(obj: any, path: string): any {
    return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

export  function setByPath(obj: any, path: string, value: any) {
    const keys = path.split(".");
    const last = keys.pop()!;
    let cur = obj;

    for (const k of keys) {
        if (typeof cur[k] !== "object" || cur[k] === null) {
            cur[k] = {};
        }
        cur = cur[k];
    }

    cur[last] = value;
}
