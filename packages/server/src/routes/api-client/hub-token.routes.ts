import { AppError } from "@yinuo-ngm/core";
import { ProjectTokenApiClient } from "@yinuo-ngm/api";
import type { FastifyInstance } from "fastify";

type HubTokenRequestBody = {
    projectId?: string;
    baseUrl?: string;
    token?: string;
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

function normalizeNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim() === "") {
        throw new AppError("BAD_REQUEST", `${field} is required`);
    }
    return value.trim();
}

function readHubTokenConfigFromProject(project: any): Partial<HubTokenResolveResult> {
    const env = (project?.env ?? {}) as Record<string, string | undefined>;
    const baseUrl = env.NGM_HUB_V2_BASE_URL ?? env.HUB_V2_BASE_URL;
    const token = env.NGM_HUB_V2_TOKEN ?? env.HUB_V2_TOKEN;
    const projectKey = env.NGM_HUB_V2_PROJECT_KEY ?? env.HUB_V2_PROJECT_KEY;
    return {
        baseUrl: baseUrl?.trim() || "",
        token: token?.trim() || "",
        projectKey: projectKey?.trim() || undefined,
    };
}

async function resolveHubTokenConfig(app: FastifyInstance, body: HubTokenRequestBody): Promise<HubTokenResolveResult> {
    const inlineBaseUrl = body.baseUrl?.trim();
    const inlineToken = body.token?.trim();
    if (inlineBaseUrl && inlineToken) {
        return { baseUrl: inlineBaseUrl, token: inlineToken };
    }

    if (!body.projectId) {
        throw new AppError("BAD_REQUEST", "projectId is required when baseUrl/token are not provided");
    }

    const project = await app.core.project.get(body.projectId);
    const config = readHubTokenConfigFromProject(project);
    if (!config.baseUrl || !config.token) {
        throw new AppError("BAD_REQUEST", "project hub-v2 config missing (NGM_HUB_V2_BASE_URL/NGM_HUB_V2_TOKEN)");
    }
    return {
        baseUrl: config.baseUrl,
        token: config.token,
        projectKey: config.projectKey,
    };
}

export async function apiClientHubTokenRoutes(fastify: FastifyInstance) {
    fastify.post("/request", async (req) => {
        const body = (req.body ?? {}) as HubTokenRequestBody;
        const path = normalizeNonEmptyString(body.path, "path");
        const method = (body.method ?? "GET").toUpperCase() as HubTokenRequestBody["method"];

        const { baseUrl, token, projectKey } = await resolveHubTokenConfig(fastify, body);
        const client = new ProjectTokenApiClient({ baseUrl, apiToken: token });

        const query = { ...(body.query ?? {}) };
        if ((query as any).projectKey === undefined && projectKey) {
            (query as any).projectKey = projectKey;
        } else if (typeof (query as any).projectKey === "string") {
            (query as any).projectKey = String((query as any).projectKey).trim();
        }

        const normalizedPath = normalizeHubTokenPath(path, projectKey);
        const data = await client.request({
            method,
            path: normalizedPath,
            query,
            body: body.body,
            headers: body.headers,
        });

        return data;
    });

    fastify.post("/resolve", async (req) => {
        const body = (req.body ?? {}) as Pick<HubTokenRequestBody, "projectId" | "baseUrl" | "token">;
        const resolved = await resolveHubTokenConfig(fastify, body);
        return {
            baseUrl: resolved.baseUrl,
            tokenConfigured: !!resolved.token,
            projectKey: resolved.projectKey ?? null,
        };
    });
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
        throw new AppError("BAD_REQUEST", "projectKey is required when path does not include /projects/:projectKey");
    }
    return `/projects/${projectKey}${p}`;
}
