export type HttpMethod =
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE"
    | "HEAD"
    | "OPTIONS";

export interface ApiRequestEntity {
    id: string;
    name: string;
    method: HttpMethod;
    url: string;
    query: Array<{ key: string; value: string; enabled: boolean }>;
    headers: Array<{ key: string; value: string; enabled: boolean }>;
    body?: {
        mode: "none" | "json" | "text" | "form" | "urlencoded" | "binary";
        content?: any;
        contentType?: string;
    };
    auth?: {
        type: "none" | "basic" | "bearer" | "apikey";
        basic?: { username: string; password: string };
        bearer?: { token: string };
        apikey?: { in: "header" | "query"; key: string; value: string };
    };
    options?: {
        timeoutMs?: number;
        followRedirects?: boolean;
        insecureTLS?: boolean;
        proxy?: string;
    };
    tags?: string[];
    createdAt: number;
    updatedAt: number;
}
