import type { McpErrorCode } from "./error-codes";

export class McpToolError extends Error {
  readonly errorCode: McpErrorCode;
  readonly code: McpErrorCode;
  readonly status?: number;
  readonly detail?: unknown;

  constructor(errorCode: McpErrorCode, message: string, detail?: unknown, status?: number) {
    super(message);
    this.name = "McpToolError";
    this.errorCode = errorCode;
    this.code = errorCode;
    this.detail = detail;
    this.status = status;
  }
}
