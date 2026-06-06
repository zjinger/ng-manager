export class HubV2HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = "HubV2HttpError";
  }
}

export function formatHubV2HttpError(status: number, statusText: string, body: unknown): string {
  const record = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const code = typeof record.code === "string" ? record.code : "HTTP_ERROR";
  const message = typeof record.message === "string" ? record.message : statusText;
  return `Hub V2 HTTP ${status} ${code}: ${message}`;
}

export function toHubV2HttpError(status: number, statusText: string, body: unknown): HubV2HttpError {
  const record = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const code = typeof record.code === "string" ? record.code : "HTTP_ERROR";
  const detail = record.detail ?? record.data ?? body;
  return new HubV2HttpError(formatHubV2HttpError(status, statusText, body), status, code, detail);
}
