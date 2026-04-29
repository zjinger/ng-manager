export type ApiHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type ApiScope = "global" | "project";

export type ApiCollectionKind = "folder" | "collection";

export type ApiRequestBodyMode = "none" | "json" | "text" | "form" | "urlencoded" | "binary";

export type ApiRequestAuthType = "none" | "basic" | "bearer" | "apikey" | "cookie";