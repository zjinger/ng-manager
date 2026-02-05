import crypto from "node:crypto";
import type { ApiHttpMethod } from "../../domain/models";

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

export type NodeHttpSendOutput = {
    status: number;
    statusText?: string;
    headers: Record<string, string>;
    bodyText: string;
    bodySize: number;
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

        const headers: Record<string, string> = { ...input.headers };
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
            const bodyText = await res.text();
            const bufSize = Buffer.byteLength(bodyText, "utf8");

            return {
                status: res.status,
                statusText: res.statusText,
                headers: headersToRecord(res.headers),
                bodyText,
                bodySize: bufSize,
            };
        } finally {
            clearTimeout(timer);
        }
    }
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

