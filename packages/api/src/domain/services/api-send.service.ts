import type { ApiHistoryEntity } from "../models/api-history";
import type { ApiRequestEntity } from "../models/api-request";
import type { ApiEnvironmentEntity } from "../models/api-environment";
import type { HistoryRepo } from "./history-repo";
import type { RequestRepo } from "./request-repo";
import type { EnvRepo } from "./env-repo";

import { VariableResolver, type ResolveContext } from "./variable-resolver";
import { NodeHttpClient, newId, buildBodyTextForSend, toCurl } from "../../infra";
import { ApiScope } from "../models/types";
import { SendDto, SendResult } from "../models";

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 支持两种占位符：
 * - :id   (REST 风格)
 * - {id}  (Postman/OpenAPI 风格)
 *
 * value 默认 encodeURIComponent，避免破坏 URL。
 */
function applyPathParams(url: string, pathParams: Array<{ key: string; value: string }>): string {
    let out = url;

    for (const p of pathParams ?? []) {
        const k = String(p.key ?? "").trim();
        if (!k) continue;
        const v = encodeURIComponent(String(p.value ?? ""));
        // :id（仅在 path segment 结束处替换，避免误伤 :8080 之类）
        out = out.replace(new RegExp(`:${escapeRegExp(k)}(?=/|$|\\?|#)`, "g"), v);
        // {id}
        out = out.replace(new RegExp(`\\{${escapeRegExp(k)}\\}`, "g"), v);
    }
    return out;
}

function buildFinalUrl(
    baseUrl: string,
    pathParams: Array<{ key: string; value: string }>,
    query: Array<{ key: string; value: string }>,
    auth: any
): string {
    const urlWithPath = applyPathParams(baseUrl, pathParams);
    const u = new URL(urlWithPath);
    // query
    for (const q of query ?? []) {
        const k = String(q.key ?? "").trim();
        if (!k) continue;
        u.searchParams.append(k, String(q.value ?? ""));
    }

    // apikey in query
    if (auth?.type === "apikey" && auth.apikey?.in === "query" && auth.apikey?.key) {
        u.searchParams.append(String(auth.apikey.key), String(auth.apikey.value ?? ""));
    }

    return u.toString();
}

export class ApiSendService {
    constructor(
        private readonly requestRepo: RequestRepo,
        private readonly envRepo: EnvRepo,
        private readonly historyRepo: HistoryRepo,
        private readonly http: NodeHttpClient,
        private readonly resolver: VariableResolver
    ) { }

    async send(dto: SendDto): Promise<SendResult> {
        const scope = dto.scope ?? "project";
        if (scope === "project" && !dto.projectId) throw new Error("projectId is required when scope=project");

        const req = await this.loadRequest(dto, scope);
        const env = await this.loadEnv(dto, scope);

        const startedAt = Date.now();
        const ctx: ResolveContext = {
            env,
            project: { id: dto.projectId, root: dto.projectRoot },
        };

        // resolve variables
        const resolved = this.resolver.resolveRequest(req, ctx);
        const finalUrl = buildFinalUrl(resolved.url, resolved.pathParams ?? [], resolved.query ?? [], resolved.auth);

        const headersLower: Record<string, string> = {};
        // 规范化为小写 key（node fetch 更一致）
        for (const [k, v] of Object.entries(resolved.headers)) headersLower[k.toLowerCase()] = String(v ?? "");
        
        const historyId = newId("hist");
        let history: ApiHistoryEntity = {
            id: historyId,
            projectId: scope === "project" ? dto.projectId : undefined,
            requestSnapshot: req,
            resolved: {
                url: finalUrl,
                headers: headersLower,
            },
            metrics: {
                startedAt,
                endedAt: startedAt,
                durationMs: 0,
            },
            createdAt: startedAt,
        };
        const curlOpts = {
            followRedirects: req.options?.followRedirects ?? true,
            insecureTLS: req.options?.insecureTLS ?? false,
            compressed: true, // 默认 true；否则可以跟随 UI 开关
        };
        try {
            const bodyTextForCurl = buildBodyTextForSend(resolved.body, headersLower);
            const toCurlInput = {
                method: req.method,
                url: finalUrl,
                headers: headersLower,
                bodyText: bodyTextForCurl,
                options: curlOpts,
            }
            const curlBash = toCurl(toCurlInput, { style: "bash", pretty: true });
            const curlPs = toCurl(toCurlInput, { style: "powershell", pretty: true });
            const curlCmd = toCurl(toCurlInput, { style: "cmd", pretty: false });

            const out = await this.http.send({
                method: req.method,
                url: finalUrl,
                headers: headersLower,
                body: resolved.body,
                auth: resolved.auth,
                options: req.options,
            });
            const curl = { bash: curlBash, powershell: curlPs, cmd: curlCmd };
            const endedAt = Date.now();
            history = {
                ...history,
                resolved: {
                    url: finalUrl,
                    headers: headersLower,
                    curl,
                },
                response: {
                    status: out.status,
                    statusText: out.statusText,
                    headers: out.headers,
                    bodyText: out.bodyText,
                    bodySize: out.bodySize,
                },
                metrics: {
                    ...history.metrics,
                    endedAt,
                    durationMs: endedAt - startedAt,
                },
            };

            await this.historyRepo.add(history, scope, dto.projectId);

            return {
                historyId,
                response: history.response,
                metrics: history.metrics,
                curl,
            };
        } catch (e: any) {
            const endedAt = Date.now();
            const err = this.normalizeError(e);

            history = {
                ...history,
                error: err,
                metrics: {
                    ...history.metrics,
                    endedAt,
                    durationMs: endedAt - startedAt,
                },
            };

            await this.historyRepo.add(history, scope, dto.projectId);

            return {
                historyId,
                error: err,
                metrics: history.metrics,
            };
        }
    }

    // ---------------- private ----------------

    private async loadRequest(dto: SendDto, scope: ApiScope): Promise<ApiRequestEntity> {
        if (dto.request?.id) return dto.request;

        if (dto.requestId) {
            const found = await this.requestRepo.get(dto.requestId, scope, dto.projectId);
            if (!found) throw new Error(`request not found: ${dto.requestId}`);
            return found;
        }

        throw new Error("request or requestId is required");
    }

    private async loadEnv(dto: SendDto, scope: ApiScope): Promise<ApiEnvironmentEntity | null> {
        if (!dto.envId) return null;
        const env = await this.envRepo.get(dto.envId, scope, dto.projectId);
        if (!env) throw new Error(`env not found: ${dto.envId}`);
        return env;
    }

    private normalizeError(e: any) {
        // AbortError / Timeout
        const name = String(e?.name ?? "");
        if (name === "AbortError") {
            return { code: "ETIMEDOUT", message: "Request timeout" };
        }

        const code = String(e?.code ?? e?.cause?.code ?? "ERR_HTTP");
        const msg = String(e?.message ?? "HTTP request failed");
        return { code, message: msg };
    }
}
