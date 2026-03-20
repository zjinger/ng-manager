export interface ApiSuccessResponse<T> {
  code: "OK";
  message: string;
  data: T;
}

export function ok<T>(data: T, message = "success"): ApiSuccessResponse<T> {
  return {
    code: "OK",
    message,
    data
  };
}
