export function getByPath(obj: any, path: string): any {
    const parts = path.split(".").filter(Boolean);
    let cur = obj;
    for (const p of parts) {
        if (cur == null) return undefined;
        cur = cur[p];
    }
    return cur;
}

