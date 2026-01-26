// webapp/.../utils/diff.ts
export type DiffRow = { path: string; before: any; after: any };

export function diffObjects(before: any, after: any, basePath = ""): DiffRow[] {
    if (before === after) return [];

    const isObj = (x: any) => x != null && typeof x === "object" && !Array.isArray(x);

    // array：MVP 直接整体对比
    if (Array.isArray(before) || Array.isArray(after)) {
        return [{ path: basePath || "/", before, after }];
    }

    // primitive
    if (!isObj(before) || !isObj(after)) {
        return [{ path: basePath || "/", before, after }];
    }

    const rows: DiffRow[] = [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const k of keys) {
        const p = basePath ? `${basePath}.${k}` : k;
        if (!(k in before)) rows.push({ path: p, before: undefined, after: after[k] });
        else if (!(k in after)) rows.push({ path: p, before: before[k], after: undefined });
        else rows.push(...diffObjects(before[k], after[k], p));
    }

    return rows;
}
