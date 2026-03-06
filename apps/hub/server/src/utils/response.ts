export function ok<T>(data: T, message = "success") {
  return {
    code: "OK",
    message,
    data
  };
}

export function fail(code: string, message: string, details?: unknown) {
  return {
    code,
    message,
    ...(details !== undefined ? { details } : {})
  };
}