export interface ApiSuccessResponse<T> {
  code: 'OK';
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}