import crypto from "node:crypto";
import type { ApiHttpMethod } from "../../domain/models";
import { ApiResponseEntityDto } from "@yinuo-ngm/protocol";
import { ApiResponseBodyType } from "@yinuo-ngm/protocol";

export type NodeHttpSendInput = {
    method: ApiHttpMethod;
    url: string;
    headers: Record<string, string>;
    body?: { mode: "none" | "json" | "text" | "form" | "urlencoded" | "binary"; content?: any; contentType?: string };
    auth?: any;
    options?: {
        timeoutMs?: number;
        followRedirects?: boolean;
        insecureTLS?: boolean;
    };
};

export type NodeHttpSendOutput = ApiResponseEntityDto & {
    setCookies?: string[];
};

function headersToRecord(headers: Headers): Record<string, string> {
    const out: Record<string, string> = {};
    headers.forEach((v, k) => (out[k] = v));
    return out;
}

function applyAuth(headers: Record<string, string>, auth: any) {
    if (!auth || auth.type === "none") return;

    if (auth.type === "basic" && auth.basic?.username != null) {
        const u = String(auth.basic.username ?? "");
        const p = String(auth.basic.password ?? "");
        const token = Buffer.from(`${u}:${p}`).toString("base64");
        headers["authorization"] = `Basic ${token}`;
        return;
    }

    if (auth.type === "bearer" && auth.bearer?.token != null) {
        headers["authorization"] = `Bearer ${String(auth.bearer.token ?? "")}`;
        return;
    }

    if (auth.type === "cookie" && auth.cookie?.value != null) {
        headers["cookie"] = String(auth.cookie.value ?? "");
        return;
    }

    if (auth.type === "apikey" && auth.apikey?.key) {
        const k = String(auth.apikey.key);
        const v = String(auth.apikey.value ?? "");
        if (auth.apikey.in === "header") headers[k] = v;
        // query 型 apikey 在上层构建 url 时处理（更干净）
    }
}

/**
 * Node HTTP Client Adapter
 * - 默认使用 global fetch
 * - 如果需要 insecureTLS，则尝试动态加载 undici 并使用 Agent + dispatcher
 */
export class NodeHttpClient {
    async send(input: NodeHttpSendInput): Promise<NodeHttpSendOutput> {
        const timeoutMs = input.options?.timeoutMs ?? 30_000;
        const followRedirects = input.options?.followRedirects ?? true;
        const insecureTLS = input.options?.insecureTLS ?? false;

        const headers = normalizeHeaders(input.headers);
        // const headers: Record<string, string> = { ...input.headers };
        applyAuth(headers, input.auth);

        const body = buildBodyTextForSend(input.body, headers);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const init: RequestInit & any = {
                method: input.method,
                headers,
                body,
                redirect: followRedirects ? "follow" : "manual",
                signal: controller.signal,
            };

            if (insecureTLS) {
                // 尽力支持：如果未安装 undici，则仍走 fetch（无法关闭 TLS 校验）
                try {
                    const undici = await import("undici");
                    const agent = new undici.Agent({
                        connect: { rejectUnauthorized: false },
                    });
                    init.dispatcher = agent;
                } catch {
                    // ignore: fallback
                }
            }

            const res = await fetch(input.url, init);
            const contentType = res.headers.get("content-type") ?? "";
            // 判断类型
            const bodyType = resolveResponseBodyType(contentType);
            const isTextLike =
                bodyType === "json" ||
                bodyType === "text" ||
                bodyType === "html" ||
                bodyType === "xml";

            let bodyText: string | undefined;
            let bodyBase64: string | undefined;
            let bodySize = 0;
                    
            if (isTextLike) {
                bodyText = await res.text();
                // json 自动格式化
                if (bodyType === "json") {
                    try {
                        bodyText = JSON.stringify(JSON.parse(bodyText), null, 2);
                    } catch {
                        // ignore
                    }
                }
                bodySize = Buffer.byteLength(bodyText, "utf8");
            } else {
                const ab = await res.arrayBuffer();
                const buffer = Buffer.from(ab);
                bodyBase64 = buffer.toString("base64");
                bodySize = buffer.length;
            }

            return {
                status: res.status,
                statusText: res.statusText,
                headers: headersToRecord(res.headers),
                bodyType,
                bodyText,
                bodyBase64,
                bodySize,
                setCookies: extractSetCookies(res.headers),
            };
        } finally {
            clearTimeout(timer);
        }
    }
}

function extractSetCookies(headers: Headers): string[] {
    const h = headers as Headers & { getSetCookie?: () => string[] };
    if (typeof h.getSetCookie === "function") {
        return h.getSetCookie();
    }
    const single = headers.get("set-cookie");
    return single ? [single] : [];
}

// 判断是否文本类型 (content-type)，用于决定 response body 是走 text 还是 binary 路径
function isTextContentType(contentType: string): boolean{
    const ct = contentType.toLowerCase();

    return (
        ct.startsWith("text/") ||
        ct.includes("json") ||
        ct.includes("xml") ||
        ct.includes("javascript") ||
        ct.includes("html") ||
        ct.includes("svg") ||
        ct.includes("x-www-form-urlencoded")
    );
}

// headers 大小写统一为小写
function normalizeHeaders(headers: Record<string,string>) {
    const out: Record<string,string> = {};

    for (const [k,v] of Object.entries(headers)) {
        out[k.toLowerCase()] = v;
    }

    return out;
}

function resolveResponseBodyType(contentType: string): ApiResponseBodyType {
    const ct = contentType.toLowerCase();

    // json
    if (ct.includes("json")) {
        return "json";
    }

    // html
    if (ct.includes("html")) {
        return "html";
    }

    // xml
    if (ct.includes("xml")) {
        return "xml";
    }

    // 普通文本
    if (
        ct.startsWith("text/") ||
        ct.includes("javascript") ||
        ct.includes("x-www-form-urlencoded")
    ) {
        return "text";
    }

    // 图片
    if (ct.startsWith("image/")) {
        return "image";
    }

    // 音频
    if (ct.startsWith("audio/")) {
        return "audio";
    }

    // 视频
    if (ct.startsWith("video/")) {
        return "video";
    }

    // PDF
    if (ct.includes("pdf")) {
        return "pdf";
    }

    // 兜底
    return "binary";
}

// 小工具：生成 id（给 history 用）
export function newId(prefix: string) {
    // 保持可读性：prefix_xxx
    const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    return `${prefix}_${rand}`;
}

export function buildBodyTextForSend(
    body: NodeHttpSendInput["body"],
    headers: Record<string, string>
): string | undefined {
    // 逻辑复制自 buildBody，但只返回 string，不修改 headers 也行
    if (!body || body.mode === "none") return undefined;

    const contentType = body.contentType?.trim();
    if (contentType && !headers["content-type"]) headers["content-type"] = contentType;

    if (body.mode === "json") {
        if (!headers["content-type"]) headers["content-type"] = "application/json; charset=utf-8";
        return JSON.stringify(body.content ?? null);
    }
    if (body.mode === "text") {
        if (!headers["content-type"]) headers["content-type"] = "text/plain; charset=utf-8";
        return String(body.content ?? "");
    }
    if (body.mode === "urlencoded" || body.mode === "form") {
        if (!headers["content-type"]) headers["content-type"] = "application/x-www-form-urlencoded; charset=utf-8";
        const sp = new URLSearchParams();
        const obj = body.content ?? {};
        for (const [k, v] of Object.entries(obj)) sp.append(k, String(v ?? ""));
        return sp.toString();
    }
    return undefined;
}
