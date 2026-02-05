import { ApiCurlStyle } from "../../domain/models";

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
    opts?: { style?: ApiCurlStyle; pretty?: boolean; maxBodyChars?: number }
): string {
    const style: ApiCurlStyle = opts?.style ?? "bash";
    const pretty = opts?.pretty ?? true;
    const maxBodyChars = opts?.maxBodyChars ?? 200_000;

    const method = (input.method || "GET").toUpperCase();
    const headers = normalizeHeaders(input.headers ?? {});
    const bodyText = truncate(input.bodyText, maxBodyChars);

    // Windows curl 更严格：cmd / powershell 输出时，对空值 query 做兼容（?k= -> ?k）
    const url = (style === "cmd" || style === "powershell")
        ? sanitizeUrlForWindowsCurl(input.url)
        : input.url;

    const parts: string[] = [];

    // PowerShell 必须 curl.exe，避免命中 Invoke-WebRequest alias
    parts.push(style === "powershell" ? "curl.exe" : "curl");

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
        parts.push(flag(style, "-H", `${k}: ${v}`));
    }

    // body
    if (bodyText != null && bodyText !== "" && method !== "GET" && method !== "HEAD") {
        parts.push(flag(style, "--data-raw", bodyText));
    }

    // join
    //  cmd 永远单行（否则 cmd 续行符/引号规则太容易踩坑）
    if (style === "cmd") return parts.join(" ");

    return pretty ? joinPretty(parts, style) : parts.join(" ");
}

// ---------------- helpers ----------------

function normalizeHeaders(h: Record<string, string>) {
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

function joinPretty(parts: string[], style: ApiCurlStyle) {
    // multiline
    // powershell: backtick 换行
    // bash: backslash 换行
    const sep = style === "powershell" ? " `\n" : " \\\n";
    return parts
        .map((p, i) => (i === 0 ? p : "  " + p))
        .join(sep);
}

function flag(style: ApiCurlStyle, name: string, value: string) {
    return `${name} ${quote(style, value)}`;
}

/**
 * 引号策略：
 * - bash: 单引号，内部 ' 用 '\'' 处理（你原逻辑）
 * - powershell: 用双引号更通用；内部 " 用 `\"（PowerShell 可接受）
 * - cmd: 用双引号；内部 " 用 \"（交给 curl 解析）
 */
function quote(style: ApiCurlStyle, s: string) {
    const text = String(s ?? "");

    if (style === "powershell") {
        // PowerShell 双引号内：`" 转义
        return `"${text.replace(/`/g, "``").replace(/"/g, '`"')}"`;
    }

    if (style === "cmd") {
        // cmd 双引号内：\"（curl 解析参数时能吃到）
        return `"${text.replace(/"/g, '\\"')}"`;
    }

    // bash: 单引号安全
    return `'${text.replace(/'/g, `'\\''`)}'`;
}

/**
 * Windows curl 对部分 URL 更严格：把空值 query 从 ?k= 变成 ?k
 * 例：
 *  - http://a/b?1=           -> http://a/b?1
 *  - http://a/b?x=&y=1      -> http://a/b?x&y=1
 *  - http://a/b?x=&y=       -> http://a/b?x&y
 */
function sanitizeUrlForWindowsCurl(url: string) {
    // 替换：([?&]name)=(&|$)  => $1$2
    return url.replace(/([?&][^=&#]+)=(&|$)/g, (_m, p1, p2) => `${p1}${p2}`);
}
