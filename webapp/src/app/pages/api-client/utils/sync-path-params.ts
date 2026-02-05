import { ApiRequestKvRow } from "@models/api-client";
import { uniqueId } from "lodash";

// 从 URL 字符串中提取 path param keys（去重，保持出现顺序）
export function extractPathParamKeys(url: string): string[] {
    if (!url) return [];

    let pathRaw = url;

    try {
        const u = new URL(url);
        pathRaw = u.pathname || "";
    } catch {
        // 相对 URL 或未带协议：退化处理
        pathRaw = url.split("?")[0].split("#")[0] || "";
        const idx = pathRaw.indexOf("/");
        if (idx >= 0) pathRaw = pathRaw.slice(idx);
    }

    // pathname 里可能是 %7B %7D（因为 new URL 会 encode { }）
    const path = safeDecodeURIComponent(pathRaw);

    const keys: string[] = [];

    // 1) :id
    const colonRe = /(?:^|\/):([A-Za-z_][A-Za-z0-9_]*)/g;
    let m: RegExpExecArray | null;
    while ((m = colonRe.exec(path))) keys.push(m[1]);

    // 2) {id}
    const braceRe = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
    while ((m = braceRe.exec(path))) keys.push(m[1]);

    // // 3) 兜底：直接支持 %7Bid%7D（即便没 decode 成功也能识别）
    // const encBraceRe = /%7B([A-Za-z_][A-Za-z0-9_]*)%7D/gi;
    // while ((m = encBraceRe.exec(pathRaw))) keys.push(m[1]);

    // 去重但保序
    // const seen = new Set<string>();
    // const out: string[] = [];
    // for (const k of keys) {
    //     if (seen.has(k)) continue;
    //     seen.add(k);
    //     out.push(k);
    // }
    return keys;
}

function safeDecodeURIComponent(s: string): string {
    try {
        return decodeURIComponent(s);
    } catch {
        return s;
    }
}

export function syncPathParamsByUrl(
    url: string,
    current: ApiRequestKvRow[] | undefined | null
): ApiRequestKvRow[] {
    const keys = extractPathParamKeys(url);
    console.log('syncPathParamsByUrl', url, keys);
    const list = Array.isArray(current) ? current : [];

    // 建索引：只拿有效 key 的行（忽略 kv-table 尾行空白）
    const map = new Map<string, ApiRequestKvRow>();
    for (const r of list) {
        const k = (r.key ?? "").trim();
        if (!k) continue;
        if (!map.has(k)) map.set(k, r);
    }

    // 生成目标 rows（按 keys 顺序）
    const next: ApiRequestKvRow[] = keys.map((k) => {
        const old = map.get(k);
        if (old) {
            // path params 不允许 checkbox：强制 enabled=true
            return { ...old, key: k, enabled: true };
        }
        return { key: k, value: "", description: "", enabled: true, id: uniqueId() };
    });

    return next;
}
