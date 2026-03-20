export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function fail(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    code,
    message,
    details
  };
}
