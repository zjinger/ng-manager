import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { HUB_API_BASE_URL } from './api-base-url.token';

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const baseUrl = inject(HUB_API_BASE_URL);
  const targetUrl = isAbsoluteUrl(req.url) ? req.url : joinUrl(baseUrl, req.url);

  return next(
    req.clone({
      url: targetUrl,
      withCredentials: true
    })
  );
};