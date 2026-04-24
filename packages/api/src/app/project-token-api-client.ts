import { ApiError, ApiErrorCodes } from "@yinuo-ngm/errors";

export type ApiQueryParams = Record<string, string | number | boolean | undefined | null>;

export type ProjectTokenApiClientOptions = {
  baseUrl: string;
  apiToken: string;
};

export type ProjectTokenRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: ApiQueryParams;
  body?: unknown;
  headers?: Record<string, string>;
};

export class ProjectTokenApiClient {
  constructor(private readonly options: ProjectTokenApiClientOptions) {}

  request<T = unknown>(options: ProjectTokenRequestOptions): Promise<T> {
    return this.send<T>({
      method: options.method ?? "GET",
      path: options.path,
      query: options.query,
      body: options.body,
      headers: options.headers
    });
  }

  getByPath<T = unknown>(path: string, query?: ApiQueryParams): Promise<T> {
    return this.request<T>({ method: "GET", path, query });
  }

  private async send<T = unknown>(input: {
    method: string;
    path: string;
    query?: ApiQueryParams;
    body?: unknown;
    headers?: Record<string, string>;
  }): Promise<T> {
    const url = this.resolveUrl(input.path, input.query);
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.options.apiToken}`,
      ...(input.headers ?? {})
    };
    if (input.body !== undefined) {
      headers["content-type"] = "application/json";
    }
    const response = await fetch(url, {
      method: input.method,
      headers,
      body: input.body === undefined ? undefined : JSON.stringify(input.body)
    });

    const payload = await this.parseJson(response);
    if (!response.ok) {
      const message = payload?.message || `hub-v2 request failed (${response.status})`;
      throw new ApiError(ApiErrorCodes.API_SEND_FAILED, message);
    }
    if (payload && typeof payload === "object" && "code" in payload) {
      if ((payload as { code?: string }).code !== "OK") {
        throw new ApiError(ApiErrorCodes.API_HUB_TOKEN_INVALID, (payload as { message?: string }).message || "hub-v2 response error");
      }
      return (payload as { data: T }).data;
    }
    return payload as T;
  }

  private resolveUrl(path: string, query?: ApiQueryParams): string {
    const root = this.options.baseUrl.replace(/\/+$/, "");
    const url = new URL(`${root}/api/token${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === "") {
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async parseJson(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
}
