export function formatHubV2HttpError(status: number, statusText: string, body: unknown): string {
  const record = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const code = typeof record.code === "string" ? record.code : "HTTP_ERROR";
  const message = typeof record.message === "string" ? record.message : statusText;
  return `Hub V2 HTTP ${status} ${code}: ${message}`;
}
