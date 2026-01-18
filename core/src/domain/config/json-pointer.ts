function unescapeToken(t: string) {
    return t.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function ptrGet(obj: any, pointer: string): any {
    if (!pointer || pointer === "/") return obj;
    const parts = pointer.split("/").slice(1).map(unescapeToken);
    let cur = obj;
    for (const p of parts) {
        if (cur == null) return undefined;
        cur = cur[p];
    }
    return cur;
}

export function ptrSet(obj: any, pointer: string, value: any): void {
    const parts = pointer.split("/").slice(1).map(unescapeToken);
    if (parts.length === 0) return;
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
        cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
}

export function ptrRemove(obj: any, pointer: string): void {
    const parts = pointer.split("/").slice(1).map(unescapeToken);
    if (parts.length === 0) return;
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        if (cur == null) return;
        cur = cur[k];
    }
    if (cur && typeof cur === "object") {
        delete cur[parts[parts.length - 1]];
    }
}
