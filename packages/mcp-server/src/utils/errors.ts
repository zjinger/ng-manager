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
  const record = error as { code?: unknown; status?: unknown; detail?: unknown };
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    status: typeof record.status === "number" ? record.status : undefined,
    detail: record.detail,
  };
}
