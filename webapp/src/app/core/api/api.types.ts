import type { ErrorCode } from '@yinuo-ngm/errors';

export type ApiMeta = {
  requestId?: string;
  ts: number;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta: ApiMeta;
};

export type ApiError = {
  ok: false;
  error: {
    code: ErrorCode | number;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
};
