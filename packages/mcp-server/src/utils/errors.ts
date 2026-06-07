export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error ?? "Unknown error");
}

export function errorMetadata(error: unknown): { code?: string; status?: number; detail?: unknown } {
  if (!error || typeof error !== "object") {
    return {};
  }
  const record = error as { code?: unknown; errorCode?: unknown; status?: unknown; detail?: unknown };
  const code = typeof record.errorCode === "string"
    ? record.errorCode
    : typeof record.code === "string"
      ? record.code
      : undefined;
  return {
    code,
    status: typeof record.status === "number" ? record.status : undefined,
    detail: record.detail,
  };
}
