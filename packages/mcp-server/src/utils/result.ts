export type ToolSuccessResult<T = unknown> = {
  ok: true;
  tool: string;
  data: T;
};

export type ToolErrorResult = {
  ok: false;
  tool: string;
  error: string;
};

export type ToolResult<T = unknown> = ToolSuccessResult<T> | ToolErrorResult;

export function ok<T>(tool: string, data: T): ToolSuccessResult<T> {
  return { ok: true, tool, data };
}

export function fail(tool: string, error: string): ToolErrorResult {
  return { ok: false, tool, error };
}

export function toMcpTextResult(result: ToolResult): {
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
