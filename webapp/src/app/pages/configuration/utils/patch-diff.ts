export type PatchRow = {
    scope: "doc" | "file";
    target: string; // docId 或 relPath
    path: string;   // 叶子路径（patch 内）
    value: any;     // after（patch 值）
};

const isObj = (x: any) => x != null && typeof x === "object" && !Array.isArray(x);

export function flattenPatch(
    scope: "doc" | "file",
    target: string,
    patch: any,
    basePath = ""
): PatchRow[] {
    if (patch === undefined) return [];
    if (!isObj(patch)) {
        return [{ scope, target, path: basePath || "/", value: patch }];
    }

    const rows: PatchRow[] = [];
    const keys = Object.keys(patch);

    // 空对象也算一个变更（通常用于创建节点），但你当前 diff 叶子化后一般不会出现
    if (keys.length === 0) {
        rows.push({ scope, target, path: basePath || "/", value: {} });
        return rows;
    }

    for (const k of keys) {
        const p = basePath ? `${basePath}.${k}` : k;
        const v = patch[k];
        if (isObj(v)) rows.push(...flattenPatch(scope, target, v, p));
        else rows.push({ scope, target, path: p, value: v });
    }
    return rows;
}
