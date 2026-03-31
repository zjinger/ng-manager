import { getErrorDefinition } from "./error-codes";

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message?: string,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    const definition = getErrorDefinition(code);
    super(message ?? definition?.message ?? "internal error");
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode ?? definition?.statusCode ?? 500;
    this.details = details;
  }
}
