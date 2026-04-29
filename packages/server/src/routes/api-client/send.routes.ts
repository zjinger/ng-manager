import type { ApiClient, ApiRequestEntity } from "@yinuo-ngm/api";
import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import type {
    ApiScope,
    SendRequestBodyDto
} from "@yinuo-ngm/protocol";
import type { FastifyInstance } from "fastify";
import { clearCookieJar, getCookieJar, mergeCookieJar } from "./hub-cookie-jar";
import { toSendResultDto } from "./route-mappers";

export async function apiClientSendRoutes(fastify: FastifyInstance) {
    const api = fastify.core.apiClient as ApiClient;

    fastify.post<{ Body: SendRequestBodyDto }>(
        "/",
        async (req) => {
            const body = req.body as SendRequestBodyDto;
            const scope = (body.scope ?? "project") as ApiScope;

            if (scope === "project" && !body.projectId) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
            }
            if (!body.request && !body.requestId) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "request or requestId is required");
            }

            const useCookieJar = body.useCookieJar !== false;
            const sessionKey = body.sessionKey ?? `${scope}:${body.projectId ?? "global"}:${body.envId ?? "default"}`;

            if (body.clearCookieJar) {
                clearCookieJar(sessionKey);
            }

            const cookieFromJar = useCookieJar ? getCookieJar(sessionKey) : undefined;
            const nextRequest = await buildRequestWithCookie(api, {
                scope,
                projectId: body.projectId,
                requestId: body.requestId,
                request: body.request,
                cookie: cookieFromJar,
            });

            const result = await api.send({
                scope,
                projectId: body.projectId,
                requestId: nextRequest ? undefined : body.requestId,
                request: nextRequest ?? body.request,
                envId: body.envId,
                projectRoot: body.projectRoot,
            });

            if (useCookieJar) {
                const setCookies = extractSetCookieHeader(result?.response?.headers?.["set-cookie"]);
                if (setCookies.length > 0) {
                    mergeCookieJar(sessionKey, setCookies);
                }
            }

            return toSendResultDto(result);
        }
    );
}

async function buildRequestWithCookie(
    api: ApiClient,
    params: {
        scope: ApiScope;
        projectId?: string;
        requestId?: string;
        request?: unknown;
        cookie?: string;
    }
): Promise<ApiRequestEntity | undefined> {
    if (!params.cookie) return params.request as ApiRequestEntity | undefined;

    const requestEntity = params.request
        ?? (params.requestId
            ? await api.getRequest(params.requestId, params.scope, params.projectId)
            : undefined);

    if (!requestEntity) return params.request as ApiRequestEntity | undefined;

    const entity = requestEntity as ApiRequestEntity;
    const next: ApiRequestEntity = {
        ...entity,
        headers: Array.isArray(entity.headers) ? [...entity.headers] : [],
        auth: entity.auth ? { ...entity.auth } : undefined,
    };

    if (next.auth?.type === "cookie" && next.auth?.cookie?.value) {
        return next;
    }

    const cookieHeader = next.headers.find((h) => String(h?.key ?? "").toLowerCase() === "cookie");
    if (cookieHeader && cookieHeader.value) {
        return next;
    }

    if (cookieHeader) {
        cookieHeader.value = params.cookie;
        cookieHeader.enabled = true;
        return next;
    }

    next.headers.push({
        key: "cookie",
        value: params.cookie,
        enabled: true,
    });

    return next;
}

function extractSetCookieHeader(raw: string | undefined): string[] {
    if (!raw) return [];
    return [raw];
}
