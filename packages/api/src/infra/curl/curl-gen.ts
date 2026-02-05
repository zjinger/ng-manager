// packages/api-client/src/infra/curl/curl-gen.ts
import { CurlStyle } from "../../domain/models";

export function toCurl(
    input: {
        method: string;
        url: string;
        headers?: Record<string, string>;
        bodyText?: string;
        options?: {
            followRedirects?: boolean; // -> -L
            insecureTLS?: boolean;     // -> -k
            compressed?: boolean;      // -> --compressed
        };
    },
    opts?: { style?: CurlStyle; pretty?: boolean; maxBodyChars?: number }
): string {
    const style: CurlStyle = opts?.style ?? "bash";
    const pretty = opts?.pretty ?? true;
    const maxBodyChars = opts?.maxBodyChars ?? 200_000;

    const method = (input.method || "GET").toUpperCase();
    const url = input.url;
    const headers = normalizeHeaders(input.headers ?? {});
    const bodyText = truncate(input.bodyText, maxBodyChars);

    const parts: string[] = [];
    parts.push("curl");

    // method
    if (method !== "GET") {
        parts.push(flag(style, "-X", method));
    }

    // options -> flags
    const followRedirects = input.options?.followRedirects ?? true;
    const insecureTLS = input.options?.insecureTLS ?? false;
    const compressed = input.options?.compressed ?? false;

    if (followRedirects) parts.push("-L");
    if (insecureTLS) parts.push("-k");
    if (compressed) parts.push("--compressed");


    // url
    parts.push(quote(style, url));

    // headers
    for (const [k, v] of Object.entries(headers)) {
        // curl header: -H "k: v"
        parts.push(flag(style, "-H", `${k}: ${v}`));
    }

    // body
    if (bodyText != null && bodyText !== "" && method !== "GET" && method !== "HEAD") {
        // prefer --data-raw to keep body unchanged
        parts.push(flag(style, "--data-raw", bodyText));
    }

    // join
    return pretty ? joinPretty(parts, style) : parts.join(" ");
}

// ---------------- helpers ----------------

function normalizeHeaders(h: Record<string, string>) {
    // curl 对 header key 不敏感，但输出统一更好
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(h)) {
        if (!k) continue;
        out[k.toLowerCase()] = String(v ?? "");
    }
    return out;
}

function truncate(s: string | undefined, n: number) {
    if (s == null) return undefined;
    const text = String(s);
    if (text.length <= n) return text;
    return text.slice(0, n) + "\n/* truncated */";
}

function joinPretty(parts: string[], style: CurlStyle) {
    // multiline
    const sep = style === "powershell" ? " `" : " \\";
    return parts
        .map((p, i) => (i === 0 ? p : "  " + p))
        .join(sep + "\n");
}

function flag(style: CurlStyle, name: string, value: string) {
    // -H "x: y" / --data-raw "..."
    return `${name} ${quote(style, value)}`;
}

function quote(style: CurlStyle, s: string) {
    // bash: single-quote safe (handle ' inside)
    // powershell: single quote too, escape by doubling ''
    if (style === "powershell") {
        return `'${String(s).replace(/'/g, "''")}'`;
    }
    // bash
    return `'${String(s).replace(/'/g, `'\\''`)}'`;
}
