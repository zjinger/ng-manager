export type ToolSuccessResult<T = unknown> = {
  ok: true;
  tool: string;
  data: T;
};

export type ToolErrorResult = {
  ok: false;
  tool: string;
  error: string;
  errorCode?: string;
  code?: string;
  status?: number;
  detail?: unknown;
};

export type ToolResult<T = unknown> = (ToolSuccessResult<T> | ToolErrorResult) & {
  truncated?: true;
  auditWarning?: {
    code: string;
    message: string;
  };
};

export function ok<T>(tool: string, data: T): ToolSuccessResult<T> {
  return { ok: true, tool, data };
}

export function fail(tool: string, error: string, metadata: { code?: string; status?: number; detail?: unknown } = {}): ToolErrorResult {
  return {
    ok: false,
    tool,
    error,
    ...(metadata.code ? { errorCode: metadata.code } : {}),
    ...(metadata.code ? { code: metadata.code } : {}),
    ...(metadata.status ? { status: metadata.status } : {}),
    ...(metadata.detail !== undefined ? { detail: metadata.detail } : {}),
  };
}

export function withAuditWarning(result: ToolResult, warning: { code: string; message: string }): ToolResult {
  return {
    ...result,
    auditWarning: warning,
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

  const truncatedText = stringifyWithinLimit(
    (preview) => buildTruncatedResult(result, text.length, preview),
    text,
    maxChars
  );
  return {
    content: [
      {
        type: "text",
        text: truncatedText,
      },
    ],
  };
}

function maxResultChars(): number {
  const value = Number.parseInt(String(process.env.NGM_MCP_MAX_RESULT_CHARS ?? ""), 10);
  return Number.isFinite(value) && value > 0 ? value : 120000;
}

function buildTruncatedResult(result: ToolResult, originalLength: number, preview: string): ToolResult<Record<string, unknown>> {
  if (result.ok) {
    return {
      ok: true,
      tool: result.tool,
      truncated: true,
      data: {
        originalLength,
        preview,
      },
    };
  }
  return {
    ok: false,
    tool: result.tool,
    error: result.error,
    errorCode: result.errorCode ?? result.code,
    code: result.code,
    status: result.status,
    truncated: true,
    detail: {
      originalLength,
      preview,
    },
  };
}

function stringifyWithinLimit(
  build: (preview: string) => ToolResult<Record<string, unknown>>,
  sourceText: string,
  maxChars: number
): string {
  let previewLength = Math.min(sourceText.length, Math.max(0, maxChars - 1000));
  while (previewLength >= 0) {
    const text = JSON.stringify(build(sourceText.slice(0, previewLength)), null, 2);
    if (text.length <= maxChars) {
      return text;
    }
    if (previewLength === 0) {
      break;
    }
    previewLength = Math.max(0, Math.floor(previewLength / 2));
  }
  return minimalTruncatedJson(maxChars);
}

function minimalTruncatedJson(maxChars: number): string {
  const buildWithDetail = (error: string) => JSON.stringify({
    ok: false,
    tool: "mcp",
    error,
    truncated: true,
    detail: {
      originalLength: null,
    },
  });
  let error = "MCP result exceeded NGM_MCP_MAX_RESULT_CHARS";
  let text = buildWithDetail(error);
  while (text.length > maxChars && error.length > 0) {
    error = error.slice(0, -1);
    text = buildWithDetail(error);
  }
  if (text.length <= maxChars) {
    return text;
  }
  const buildMinimal = (minimalError: string) => JSON.stringify({
    ok: false,
    tool: "mcp",
    error: minimalError,
    truncated: true,
  });
  error = "MCP result truncated";
  text = buildMinimal(error);
  while (text.length > maxChars && error.length > 0) {
    error = error.slice(0, -1);
    text = buildMinimal(error);
  }
  return text.length <= maxChars ? text : "{}";
}
