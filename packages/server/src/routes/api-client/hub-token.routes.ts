import { GlobalError, GlobalErrorCodes, Project } from "@yinuo-ngm/core";
import { ProjectTokenApiClient } from "@yinuo-ngm/api";
import type { FastifyInstance, FastifyReply } from "fastify";
import { Readable } from "node:stream";

type HubTokenType = "project" | "personal";
type HubHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type HubTokenRequestBody = {
    projectId?: string;
    baseUrl?: string;
    token?: string;
    personalToken?: string;
    tokenType?: HubTokenType;
    path?: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    query?: Record<string, string | number | boolean | undefined | null>;
    body?: unknown;
    headers?: Record<string, string>;
};

type HubTokenResolveResult = {
    baseUrl: string;
    token: string;
    projectKey?: string;
};

type HubProjectConfig = {
    baseUrl: string;
    token: string;
    personalToken: string;
    projectKey?: string;
};

function normalizeNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim() === "") {
        throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, `${field} is required`);
    }
    return value.trim();
}

function readHubTokenConfigFromProject(project: Project): HubProjectConfig {
    const env = (project?.env ?? {}) as Record<string, string | undefined>;
    const baseUrl = env.NGM_HUB_V2_BASE_URL ?? env.HUB_V2_BASE_URL;
    const token = env.NGM_HUB_V2_TOKEN ?? env.HUB_V2_TOKEN;
    const personalToken = env.NGM_HUB_V2_PERSONAL_TOKEN ?? env.HUB_V2_PERSONAL_TOKEN;
    const projectKey = env.NGM_HUB_V2_PROJECT_KEY ?? env.HUB_V2_PROJECT_KEY;
    return {
        baseUrl: baseUrl?.trim() || "",
        token: token?.trim() || "",
        personalToken: personalToken?.trim() || "",
        projectKey: projectKey?.trim() || undefined,
    };
}

async function resolveHubTokenConfig(
    app: FastifyInstance,
    body: HubTokenRequestBody,
    tokenType: HubTokenType
): Promise<HubTokenResolveResult> {
    const inlineBaseUrl = body.baseUrl?.trim();
    const inlineToken =
        tokenType === "personal"
            ? body.personalToken?.trim() || body.token?.trim()
            : body.token?.trim();
    if (inlineBaseUrl && inlineToken) {
        return { baseUrl: inlineBaseUrl, token: inlineToken };
    }

    if (!body.projectId) {
        throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when baseUrl/token are not provided");
    }

    const project = await app.core.project.get(body.projectId);
    const config = readHubTokenConfigFromProject(project);
    const resolvedToken = tokenType === "personal" ? body.personalToken?.trim() || config.personalToken : config.token;
    if (!config.baseUrl || !resolvedToken) {
        throw new GlobalError(
            GlobalErrorCodes.BAD_REQUEST,
            tokenType === "personal"
                ? "project hub-v2 config missing (NGM_HUB_V2_BASE_URL/NGM_HUB_V2_PERSONAL_TOKEN)"
                : "project hub-v2 config missing (NGM_HUB_V2_BASE_URL/NGM_HUB_V2_TOKEN)"
        );
    }
    return {
        baseUrl: config.baseUrl,
        token: resolvedToken,
        projectKey: config.projectKey,
    };
}

export async function apiClientHubTokenRoutes(fastify: FastifyInstance) {
    fastify.get("/projects/:projectId/issues/:issueId/attachments/:attachmentId/raw", async (req, reply) => {
        const params = (req.params ?? {}) as { projectId?: string; issueId?: string; attachmentId?: string };
        const projectId = normalizeNonEmptyString(params.projectId, "projectId");
        const issueId = normalizeNonEmptyString(params.issueId, "issueId");
        const attachmentId = normalizeNonEmptyString(params.attachmentId, "attachmentId");

        const { baseUrl, token, projectKey } = await resolveHubTokenConfig(fastify, { projectId }, "project");
        const normalizedPath = normalizeHubTokenPath(`/issues/${issueId}/attachments/${attachmentId}/raw`, projectKey);
        const response = await requestHubApiRaw(baseUrl, "/api/token", token, "GET", normalizedPath);
        if (!response.ok) {
            const payload = await parseJson(response);
            throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, payload?.message || `hub-v2 request failed (${response.status})`, {
                status: response.status,
                response: payload,
            });
        }

        copyRawResponseHeaders(response, reply);
        const body = response.body;
        if (!body) {
            return reply.status(response.status).send();
        }
        return reply.status(response.status).send(Readable.fromWeb(body as any));
    });

    fastify.get("/projects/:projectId/issues/:issueId/uploads/:uploadId/raw", async (req, reply) => {
        const params = (req.params ?? {}) as { projectId?: string; issueId?: string; uploadId?: string };
        const projectId = normalizeNonEmptyString(params.projectId, "projectId");
        const issueId = normalizeNonEmptyString(params.issueId, "issueId");
        const uploadId = normalizeNonEmptyString(params.uploadId, "uploadId");

        const { baseUrl, token, projectKey } = await resolveHubTokenConfig(fastify, { projectId }, "project");
        const normalizedPath = normalizeHubTokenPath(`/issues/${issueId}/uploads/${uploadId}/raw`, projectKey);
        const response = await requestHubApiRaw(baseUrl, "/api/token", token, "GET", normalizedPath);
        if (!response.ok) {
            const payload = await parseJson(response);
            throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, payload?.message || `hub-v2 request failed (${response.status})`, {
                status: response.status,
                response: payload,
            });
        }

        copyRawResponseHeaders(response, reply);
        const body = response.body;
        if (!body) {
            return reply.status(response.status).send();
        }
        return reply.status(response.status).send(Readable.fromWeb(body as any));
    });

    fastify.get("/projects/:projectId/rd-items/:itemId/uploads/:uploadId/raw", async (req, reply) => {
        const params = (req.params ?? {}) as { projectId?: string; itemId?: string; uploadId?: string };
        const projectId = normalizeNonEmptyString(params.projectId, "projectId");
        const itemId = normalizeNonEmptyString(params.itemId, "itemId");
        const uploadId = normalizeNonEmptyString(params.uploadId, "uploadId");

        const { baseUrl, token, projectKey } = await resolveHubTokenConfig(fastify, { projectId }, "project");
        const normalizedPath = normalizeHubTokenPath(`/rd-items/${itemId}/uploads/${uploadId}/raw`, projectKey);
        const response = await requestHubApiRaw(baseUrl, "/api/token", token, "GET", normalizedPath);
        if (!response.ok) {
            const payload = await parseJson(response);
            throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, payload?.message || `hub-v2 request failed (${response.status})`, {
                status: response.status,
                response: payload,
            });
        }

        copyRawResponseHeaders(response, reply);
        const body = response.body;
        if (!body) {
            return reply.status(response.status).send();
        }
        return reply.status(response.status).send(Readable.fromWeb(body as any));
    });


    fastify.post("/request", async (req) => {
        const body = (req.body ?? {}) as HubTokenRequestBody;
        const path = normalizeNonEmptyString(body.path, "path");
        assertPathProjectSegmentNotLocalProjectId(path, body.projectId);
        const method = (body.method ?? "GET").toUpperCase() as HubHttpMethod;
        const tokenType: HubTokenType = body.tokenType === "personal" ? "personal" : "project";

        const { baseUrl, token, projectKey } = await resolveHubTokenConfig(fastify, body, tokenType);

        const query = { ...(body.query ?? {}) };
        if ((query as any).projectKey === undefined && projectKey) {
            (query as any).projectKey = projectKey;
        } else if (typeof (query as any).projectKey === "string") {
            (query as any).projectKey = String((query as any).projectKey).trim();
        }

        const normalizedPath =
            tokenType === "personal"
                ? normalizeHubPersonalPath(path, projectKey)
                : normalizeHubTokenPath(path, projectKey);

        const data =
            tokenType === "project"
                ? await requestByProjectTokenClient(baseUrl, token, method, normalizedPath, query, body.body, body.headers)
                : await requestHubApi(baseUrl, "/api/personal", token, method, normalizedPath, query, body.body, body.headers);

        return data;
    });

    fastify.post("/resolve", async (req) => {
        const body = (req.body ?? {}) as Pick<HubTokenRequestBody, "projectId" | "baseUrl" | "token" | "personalToken">;
        const resolvedProject = await resolveHubTokenConfig(fastify, body, "project");
        let personalTokenConfigured = false;
        try {
            await resolveHubTokenConfig(fastify, body, "personal");
            personalTokenConfigured = true;
        } catch {
            personalTokenConfigured = false;
        }
        return {
            baseUrl: resolvedProject.baseUrl,
            tokenConfigured: !!resolvedProject.token,
            personalTokenConfigured,
            projectKey: resolvedProject.projectKey ?? null,
        };
    });
}

function copyRawResponseHeaders(response: Response, reply: FastifyReply) {
    const passthroughHeaders = [
        "content-type",
        "content-disposition",
        "content-length",
        "cache-control",
        "etag",
        "last-modified",
    ];

    for (const key of passthroughHeaders) {
        const value = response.headers.get(key);
        if (!value) {
            continue;
        }
        reply.header(key, value);
    }
}

async function requestByProjectTokenClient(
    baseUrl: string,
    token: string,
    method: HubHttpMethod,
    path: string,
    query?: Record<string, string | number | boolean | undefined | null>,
    body?: unknown,
    headers?: Record<string, string>
) {
    const client = new ProjectTokenApiClient({ baseUrl, apiToken: token });
    return client.request({
        method,
        path,
        query,
        body,
        headers,
    });
}

async function requestHubApi(
    baseUrl: string,
    apiPrefix: "/api/token" | "/api/personal",
    token: string,
    method: HubHttpMethod,
    path: string,
    query?: Record<string, string | number | boolean | undefined | null>,
    body?: unknown,
    headers?: Record<string, string>
) {
    const root = baseUrl.replace(/\/+$/, "");
    const url = new URL(`${root}${apiPrefix}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value === undefined || value === null || value === "") {
            continue;
        }
        url.searchParams.set(key, String(value));
    }

    const requestHeaders: Record<string, string> = {
        authorization: `Bearer ${token}`,
        ...(headers ?? {}),
    };
    if (body !== undefined) {
        requestHeaders["content-type"] = "application/json";
    }

    const response = await fetch(url.toString(), {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload = await parseJson(response);
    if (!response.ok) {
        throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, payload?.message || `hub-v2 request failed (${response.status})`, {
            status: response.status,
            response: payload,
        });
    }
    if (payload && typeof payload === "object" && "code" in payload) {
        if ((payload as { code?: string }).code !== "OK") {
            throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, (payload as { message?: string }).message || "hub-v2 response error", {
                response: payload,
            });
        }
        return (payload as { data: unknown }).data;
    }
    return payload;
}

async function requestHubApiRaw(
    baseUrl: string,
    apiPrefix: "/api/token" | "/api/personal",
    token: string,
    method: HubHttpMethod,
    path: string,
    query?: Record<string, string | number | boolean | undefined | null>,
    headers?: Record<string, string>
) {
    const root = baseUrl.replace(/\/+$/, "");
    const url = new URL(`${root}${apiPrefix}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value === undefined || value === null || value === "") {
            continue;
        }
        url.searchParams.set(key, String(value));
    }

    const requestHeaders: Record<string, string> = {
        authorization: `Bearer ${token}`,
        ...(headers ?? {}),
    };

    return fetch(url.toString(), {
        method,
        headers: requestHeaders,
    });
}

async function parseJson(response: Response): Promise<any> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function assertPathProjectSegmentNotLocalProjectId(path: string, projectId?: string): void {
    const localProjectId = projectId?.trim();
    if (!localProjectId) {
        return;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const matched = normalizedPath.match(/^\/projects\/([^\/]+)(?:\/|$)/i);
    if (!matched) {
        return;
    }

    const projectSegment = (matched[1] ?? "").trim();
    if (projectSegment && projectSegment === localProjectId) {
        throw new GlobalError(
            GlobalErrorCodes.BAD_REQUEST,
            "path must use projectKey (or business relative path), not local projectId"
        );
    }
}

function normalizeHubTokenPath(path: string, projectKey?: string): string {
    const p = path.startsWith("/") ? path : `/${path}`;
    const m = p.match(/^\/projects\/([^\/]+)(\/.*)?$/i);
    if (m) {
        const key = (m[1] ?? "").trim();
        const rest = m[2] ?? "";
        return `/projects/${key}${rest}`;
    }
    if (!projectKey) {
        throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectKey is required when path does not include /projects/:projectKey");
    }
    return `/projects/${projectKey}${p}`;
}

function normalizeHubPersonalPath(path: string, projectKey?: string): string {
    const p = path.startsWith("/") ? path : `/${path}`;
    if (/^\/me(?:\/|$)/i.test(p)) {
        return p;
    }
    return normalizeHubTokenPath(p, projectKey);
}
