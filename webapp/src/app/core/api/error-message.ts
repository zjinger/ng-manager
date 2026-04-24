import { HttpErrorResponse } from '@angular/common/http';
import { ApiBizError } from './api-biz-error';

function getObjectProp(value: unknown, key: string): unknown {
  if (value && typeof value === 'object' && key in value) {
    return (value as Record<string, unknown>)[key];
  }
  return undefined;
}

export function getApiErrorMessage(error: unknown, fallback = '请求失败'): string {
  if (error instanceof ApiBizError) {
    return error.message || fallback;
  }

  if (error instanceof HttpErrorResponse) {
    const nested = getObjectProp(error.error, 'message');
    if (typeof nested === 'string' && nested.trim()) {
      return nested;
    }
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  const directMessage = getObjectProp(error, 'message');
  if (typeof directMessage === 'string' && directMessage.trim()) {
    return directMessage;
  }

  const nestedError = getObjectProp(error, 'error');
  const nestedMessage = getObjectProp(nestedError, 'message');
  if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
    return nestedMessage;
  }

  return fallback;
}
