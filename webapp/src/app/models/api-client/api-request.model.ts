import { ApiHttpMethod } from "./api-types.model";

export type ApiRequestKvRow = { key: string; value: string; enabled: boolean; description?: string };

export type ApiRequestEntityBodyMode = "none" | "json" | "text" | "form" | "urlencoded" | "binary";

export type ApiRequestEntityAuthType = "none" | "basic" | "bearer" | "apikey";

export interface ApiRequestEntityBody {
    mode: ApiRequestEntityBodyMode;
    content?: any;
    contentType?: string;
}

export interface ApiRequestEntityAuth {
    type: ApiRequestEntityAuthType;
    basic?: { username: string; password: string };
    bearer?: { token: string };
    apikey?: { in: "header" | "query"; key: string; value: string };
}

export interface ApiRequestEntityOptions {
    timeoutMs?: number;
    followRedirects?: boolean;
    insecureTLS?: boolean;
    proxy?: string;
}
export interface ApiRequestEntity {
    id: string;
    name: string;
    method: ApiHttpMethod;
    url: string;
    query: ApiRequestKvRow[];
    pathParams: ApiRequestKvRow[];
    headers: ApiRequestKvRow[];
    body?: ApiRequestEntityBody;
    auth?: ApiRequestEntityAuth;
    options?: ApiRequestEntityOptions;
    tags?: string[];
    createdAt: number;
    updatedAt: number;
}