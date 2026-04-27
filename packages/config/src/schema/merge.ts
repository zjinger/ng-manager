export function deepMerge<T>(base: T, patch: any): T {
    if (patch == null) return base;
    if (Array.isArray(base) || Array.isArray(patch)) {
        // MVP：数组直接替换（后续可做更细粒度）
        return patch as T;
    }
    if (typeof base !== "object" || typeof patch !== "object") {
        return patch as T;
    }
    const out: any = { ...(base as any) };
    for (const [k, v] of Object.entries(patch)) {
        out[k] = k in out ? deepMerge(out[k], v) : v;
    }
    return out as T;
}
