import { ApiHttpMethod } from "./types";

export interface ApiRequestKv {
    key: string;
    value: string;
    enabled: boolean;
}

export type ApiRequestBodyMode =
    | "none"
    | "json"
    | "text"
    | "form"
    | "urlencoded"
    | "binary";

export type ApiRequestAuthType = "none" | "basic" | "bearer" | "apikey" | "cookie";

export interface ApiRequestOptions {
    timeoutMs?: number;
    followRedirects?: boolean;
    insecureTLS?: boolean;
    proxy?: string;
}
export interface ApiRequestBody {
    mode: ApiRequestBodyMode;
    content?: any;
    contentType?: string;
}

export interface ApiRequestAuth {
    type: ApiRequestAuthType;
    basic?: { username: string; password: string };
    bearer?: { token: string };
    apikey?: { in: "header" | "query"; key: string; value: string };
    cookie?: { value: string };
}

export interface ApiRequestEntity {
    id: string;
    name: string;
    method: ApiHttpMethod;
    url: string;
    // Params
    query: Array<ApiRequestKv>;
    pathParams?: Array<ApiRequestKv>; //  new（enabled 先保留，和 Query 对齐）
    headers: Array<ApiRequestKv>;
    body?: ApiRequestBody;
    auth?: ApiRequestAuth;
    options?: ApiRequestOptions;

    collectionId?: string | null; // null = 未归类（或默认集合）
    order?: number;               // 同 collection 内排序

    tags?: string[];
    createdAt: number;
    updatedAt: number;
}
