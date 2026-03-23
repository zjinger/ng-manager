export interface ApiSuccessResponse<T> {
  code: 'OK';
  message: string;
  data: T;
}
