export type ToolSuccessResult<T = unknown> = {
  ok: true;
  tool: string;
  data: T;
};

export type ToolErrorResult = {
  ok: false;
  tool: string;
  error: string;
  code?: string;
  status?: number;
  detail?: unknown;
};

export type ToolResult<T = unknown> = (ToolSuccessResult<T> | ToolErrorResult) & {
  truncated?: true;
};

export function ok<T>(tool: string, data: T): ToolSuccessResult<T> {
  return { ok: true, tool, data };
}

export function fail(tool: string, error: string, metadata: { code?: string; status?: number; detail?: unknown } = {}): ToolErrorResult {
  return {
    ok: false,
    tool,
    error,
    ...(metadata.code ? { code: metadata.code } : {}),
    ...(metadata.status ? { status: metadata.status } : {}),
    ...(metadata.detail !== undefined ? { detail: metadata.detail } : {}),
  };
}

export function toMcpTextResult(result: ToolResult): {
  content: Array<{ type: "text"; text: string }>;
} {
  const maxChars = maxResultChars();
  const text = JSON.stringify(result, null, 2);
  if (text.length <= maxChars) {
    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  }

  const truncatedText = JSON.stringify(buildTruncatedResult(result, text, maxChars), null, 2);
  return {
    content: [
      {
        type: "text",
        text: truncatedText.length <= maxChars ? truncatedText : truncateJsonText(truncatedText, maxChars),
      },
    ],
  };
}

function maxResultChars(): number {
  const value = Number.parseInt(String(process.env.NGM_MCP_MAX_RESULT_CHARS ?? ""), 10);
  return Number.isFinite(value) && value > 0 ? value : 120000;
}

function buildTruncatedResult(result: ToolResult, text: string, maxChars: number): ToolResult<Record<string, unknown>> {
  const previewLength = Math.max(0, maxChars - 1000);
  const preview = text.slice(0, previewLength);
  if (result.ok) {
    return {
      ok: true,
      tool: result.tool,
      truncated: true,
      data: {
        originalLength: text.length,
        preview,
      },
    };
  }
  return {
    ok: false,
    tool: result.tool,
    error: result.error,
    code: result.code,
    status: result.status,
    truncated: true,
    detail: {
      originalLength: text.length,
      preview,
    },
  };
}

function truncateJsonText(text: string, maxChars: number): string {
  const safeMax = Math.max(200, maxChars);
  return JSON.stringify(
    {
      ok: false,
      tool: "mcp",
      error: "MCP result exceeded NGM_MCP_MAX_RESULT_CHARS and could not be serialized within the limit",
      truncated: true,
      detail: {
        originalLength: text.length,
        preview: text.slice(0, Math.max(0, safeMax - 300)),
      },
    },
    null,
    2
  );
}
