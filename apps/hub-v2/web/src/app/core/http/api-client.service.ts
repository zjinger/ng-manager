import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from './api-base-url.token';
import type { ApiSuccessResponse } from './api-response';

type QueryValue = string | number | boolean | null | undefined;

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get<T>(path: string, query?: object): Observable<T> {
    return this.http
      .get<ApiSuccessResponse<T>>(this.buildUrl(path), {
        params: this.buildParams(query),
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  post<T, B = unknown>(path: string, body?: B, query?: object): Observable<T> {
    return this.http
      .post<ApiSuccessResponse<T>>(this.buildUrl(path), body ?? {}, {
        params: this.buildParams(query),
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  patch<T, B = unknown>(path: string, body?: B): Observable<T> {
    return this.http
      .patch<ApiSuccessResponse<T>>(this.buildUrl(path), body ?? {}, {
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  put<T, B = unknown>(path: string, body?: B): Observable<T> {
    return this.http
      .put<ApiSuccessResponse<T>>(this.buildUrl(path), body ?? {}, {
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<ApiSuccessResponse<T>>(this.buildUrl(path), {
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  private buildUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  private buildParams(query?: object): HttpParams | undefined {
    if (!query) {
      return undefined;
    }

    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (!this.isQueryValue(value) || value === '') {
        continue;
      }
      params = params.set(key, String(value));
    }

    return params;
  }

  private isQueryValue(value: unknown): value is QueryValue {
    return value === null || value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }
}
