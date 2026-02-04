export class ApiClientModel {
}


export type ApiRequestDraft = {
    id: string;
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
    url: string;

    query: Array<{ key: string; value: string; enabled: boolean }>;
    headers: Array<{ key: string; value: string; enabled: boolean }>;

    body?: { mode: 'none' | 'json' | 'text' | 'urlencoded'; content?: any; contentType?: string };

    auth?: { type: 'none' | 'basic' | 'bearer' | 'apikey'; basic?: any; bearer?: any; apikey?: any };

    options?: { timeoutMs?: number; followRedirects?: boolean; insecureTLS?: boolean };
};
