import type { ApiHistoryEntity } from "../models/api-history";
import type { ApiRequestEntity } from "../models/api-request";
import type { ApiEnvironmentEntity } from "../models/api-environment";
import type { HistoryRepo } from "./history-repo";
import type { RequestRepo } from "./request-repo";
import type { EnvRepo } from "./env-repo";

import { VariableResolver, type ResolveContext } from "./variable-resolver";
import { NodeHttpClient, newId, buildBodyTextForSend, toCurl } from "../../infra";
import { ApiScope } from "../models/types";

export type SendDto = {
    scope: ApiScope;
    projectId?: string;

    // 二选一：requestId 或 request
    requestId?: string;
    request?: ApiRequestEntity;

    envId?: string;

    // 可选：提供 projectRoot 等上下文
    projectRoot?: string;
};

export type SendResult = {
    historyId: string;
    response?: ApiHistoryEntity["response"];
    error?: ApiHistoryEntity["error"];
    metrics: ApiHistoryEntity["metrics"];
    curl?: {
        bash: string;
        powershell: string;
    };
};

function buildFinalUrl(baseUrl: string, query: Array<{ key: string; value: string }>, auth: any): string {
    const u = new URL(baseUrl);

    // query
    for (const q of query) {
        u.searchParams.append(q.key, q.value);
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
        const finalUrl = buildFinalUrl(resolved.url, resolved.query, resolved.auth);

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

            const out = await this.http.send({
                method: req.method,
                url: finalUrl,
                headers: headersLower,
                body: resolved.body,
                auth: resolved.auth,
                options: req.options,
            });

            const endedAt = Date.now();
            history = {
                ...history,
                resolved: {
                    url: finalUrl,
                    headers: headersLower,
                    curl: {
                        bash: curlBash,
                        powershell: curlPs,
                    },
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
                curl: { bash: curlBash, powershell: curlPs },
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
