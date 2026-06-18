/**
 * Design Handoff 错误处理
 */

/** HTTP 错误 */
export class DesignHandoffHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: unknown,
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "DesignHandoffHttpError";
  }
}

/** 解析响应体 */
function parseResponseBody(text: string): unknown {
  if (!text.trim()) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** 从响应体提取消息 */
function extractMessage(parsed: unknown, statusText: string): string {
  if (typeof parsed === "object" && parsed !== null && "message" in parsed) {
    return String((parsed as Record<string, unknown>).message);
  }
  return statusText;
}

/**
 * 处理 HTTP 响应错误
 */
export async function handleHttpError(response: Response): Promise<never> {
  const text = await response.text();
  const parsed = parseResponseBody(text);
  const message = extractMessage(parsed, response.statusText);
  throw new DesignHandoffHttpError(response.status, message, parsed);
}
