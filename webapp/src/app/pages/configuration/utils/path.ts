export function getByPath(obj: any, path: string) {
    return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

export function setByPath(obj: any, path: string, value: any) {
    const keys = path.split(".");
    const last = keys.pop()!;
    let cur = obj;
    for (const k of keys) {
        cur[k] ??= {};
        cur = cur[k];
    }
    cur[last] = value;
}
